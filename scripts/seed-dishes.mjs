#!/usr/bin/env node
/**
 * 把 db/seed/dishes.json 里的菜谱幂等导入 CloudBase 云数据库。
 *
 * 用法：
 *   1. 在 .env.local 里配置（或在命令行里 export）：
 *        TCB_ENV_ID=xxx-xxxx
 *        TENCENTCLOUD_SECRETID=AKID...
 *        TENCENTCLOUD_SECRETKEY=xxxx
 *   2. npm run seed           # 正式写入
 *      npm run seed -- --dry-run   # 只打印将要写入的菜名，不写库
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cloudbase from "@cloudbase/node-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));

const envId = process.env.TCB_ENV_ID;
const secretId = process.env.TENCENTCLOUD_SECRETID;
const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
const dryRun = process.argv.includes("--dry-run");

if (!envId || !secretId || !secretKey) {
  console.error(
    "缺少配置。请在项目根目录的 .env.local 里填写：\n" +
      "  TCB_ENV_ID=你的云开发环境ID\n" +
      "  TENCENTCLOUD_SECRETID=你的SecretId\n" +
      "  TENCENTCLOUD_SECRETKEY=你的SecretKey\n\n" +
      "密钥获取地址：https://console.cloud.tencent.com/cam/capi"
  );
  process.exit(1);
}

const dishes = JSON.parse(
  fs.readFileSync(path.join(ROOT, "db", "seed", "dishes.json"), "utf8")
);
console.log(`读取到本地菜谱 ${dishes.length} 道`);

const app = cloudbase.init({ env: envId, secretId, secretKey });
const db = app.database();
const dishesCol = db.collection("dishes");

async function existingNames() {
  const names = new Set();
  let skip = 0;
  const pageSize = 100;
  for (;;) {
    const res = await dishesCol
      .field({ name: true })
      .skip(skip)
      .limit(pageSize)
      .get();
    const list = res?.data ?? [];
    list.forEach((d) => d?.name && names.add(d.name));
    if (list.length < pageSize) break;
    skip += pageSize;
  }
  return names;
}

async function main() {
  const has = await existingNames();
  const toAdd = dishes.filter((d) => !has.has(d.name));

  if (toAdd.length === 0) {
    console.log("菜谱已是最新，没有需要新增的菜（按菜名去重，可重复执行）");
    return;
  }

  console.log(`已存在 ${has.size} 道，待新增 ${toAdd.length} 道：`);
  toAdd.forEach((d) => console.log(`  + ${d.name}（${d.category}）`));

  if (dryRun) {
    console.log("\n--dry-run：未写入数据库");
    return;
  }

  let ok = 0;
  for (let i = 0; i < toAdd.length; i += 20) {
    const batch = toAdd.slice(i, i + 20).map((d, idx) => ({
      ...d,
      coverUrl: "",
      available: true,
      sort: (has.size + i + idx) * 1,
      createdAt: Date.now(),
    }));
    await Promise.all(batch.map((d) => dishesCol.add(d)));
    ok += batch.length;
    console.log(`  已写入 ${ok}/${toAdd.length}`);
  }
  console.log("\n导入完成！现在打开应用就可以看到这些菜了。");
}

main().catch((error) => {
  console.error("导入失败：", error);
  process.exit(1);
});
