/**
 * 逐条执行 SQL 文件到 CloudBase PostgreSQL：
 * node scripts/pg-exec.mjs ./db/pg/schema.sql
 * CloudBase 的 ExecutePGSql 一次只接受一条语句，所以这里按语句拆分后串行调用 tcb CLI。
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const file = process.argv[2] || "db/pg/schema.sql";
const envId = process.env.TCB_ENV_ID || "eligible-heron-d2gqpn9c8e6230998";

/** 拆分语句：忽略 -- 注释，保留 $$ ... $$ 块内部的 semicolon */
function splitStatements(sql) {
  const lines = sql.split("\n").filter((l) => !l.trim().startsWith("--"));
  const text = lines.join("\n");
  const out = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inDollar && ch === "$" && text[i + 1] === "$") {
      inDollar = true;
      buf += "$$";
      i++;
      continue;
    }
    if (inDollar && ch === "$" && text[i + 1] === "$") {
      inDollar = false;
      buf += "$$";
      i++;
      continue;
    }
    if (ch === ";" && !inDollar) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

async function run(rawStmt) {
  const stmt = rawStmt.replace(/\s+/g, " ").trim();
  const args = ["db", "execute", "-e", envId, "--sql", stmt, "--json"];
  if (process.platform === "win32") {
    // Windows 下走 PowerShell 调用（tcb 是 .cmd 包装，cmd.exe 传参会截断 SQL）
    const ps = `tcb db execute -e ${envId} --sql '${stmt.replace(/'/g, "''")}' --json`;
    const { stdout, stderr } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", ps],
      { maxBuffer: 1024 * 1024 * 8, windowsHide: true },
    );
    return stdout || stderr;
  }
  const { stdout, stderr } = await execFileAsync("tcb", args, { maxBuffer: 1024 * 1024 * 8 });
  return stdout || stderr;
}

const statements = splitStatements(readFileSync(resolve(root, file), "utf8"));
console.log(`共 ${statements.length} 条语句，开始执行…`);

let ok = 0;
for (let i = 0; i < statements.length; i++) {
  const s = statements[i].replace(/\s+/g, " ").slice(0, 90);
  try {
    const out = await run(statements[i]);
    if (out.includes('"code"') && out.includes("Error")) {
      console.error(`✗ [${i + 1}] ${s}\n   ${out.trim().slice(0, 300)}`);
    } else {
      ok++;
      console.log(`✓ [${i + 1}/${statements.length}] ${s}`);
    }
  } catch (error) {
    console.error(`✗ [${i + 1}] ${s}\n   ${String(error?.stdout || error?.message || error).slice(0, 300)}`);
  }
}
console.log(`完成：成功 ${ok} / ${statements.length}`);
