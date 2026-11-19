/**
 * 通过 PostgREST 接口把菜谱灌进 CloudBase PostgreSQL（一次请求写入全部菜品，幂等）：
 * TCB_SERVICE_KEY=<key> node scripts/seed-pg-rest.mjs
 * 说明：key 用 service_role，只在本机运行，绝不写进前端代码。
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envId = process.env.TCB_ENV_ID || "eligible-heron-d2gqpn9c8e6230998";
const key = process.env.TCB_SERVICE_KEY;
if (!key) {
  console.error("缺少环境变量 TCB_SERVICE_KEY");
  process.exit(1);
}

const dishes = JSON.parse(readFileSync(resolve(root, "db/seed/dishes.json"), "utf8"));
const now = Date.now();

const rows = dishes.map((d, i) => ({
  id: `dish_${String(i + 1).padStart(3, "0")}`,
  name: d.name,
  category: d.category,
  description: d.desc ?? "",
  cover_url: "",
  ingredients: d.ingredients ?? [],
  steps: d.steps ?? [],
  tags: d.tags ?? [],
  spicy_level: d.spicyLevel ?? 0,
  available: true,
  sort: i,
  created_at: now - (dishes.length - i) * 1000,
}));

const url = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest/dishes`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("写入失败", res.status, await res.text());
  process.exit(1);
}
console.log(`菜谱写入完成：${rows.length} 道菜 → ${url}`);
