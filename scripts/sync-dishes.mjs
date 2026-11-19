/**
 * 把种子菜谱同步到线上 PostgreSQL dishes 表（按菜名 upsert，不动已有 id）：
 * node scripts/sync-dishes.mjs
 * - 线上已存在的菜：PATCH 更新 desc/source/做法/封面（保留 available、sort、createdAt）
 * - 新增的菜：POST 插入
 * 凭据取 .env.local 里的 VITE_TCB_ACCESS_KEY（Publishable Key， anon 角色）。
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedDishes } from "./seed-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envId = process.env.TCB_ENV_ID || "eligible-heron-d2gqpn9c8e6230998";

const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const key = envFile
  .split(/\r?\n/)
  .find((l) => l.startsWith("VITE_TCB_ACCESS_KEY="))
  ?.slice("VITE_TCB_ACCESS_KEY=".length)
  .trim();
if (!key || key.length < 50) {
  console.error(".env.local 里缺少 VITE_TCB_ACCESS_KEY");
  process.exit(1);
}

const base = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const dishes = loadSeedDishes();

// 1. 拉取线上现有菜品映射 name → id
const res = await fetch(`${base}/dishes?select=id,name&limit=1000`, { headers });
if (!res.ok) {
  console.error("拉取线上菜品失败", res.status, await res.text());
  process.exit(1);
}
const remote = new Map((await res.json()).map((r) => [r.name, r.id]));
console.log(`线上现有 ${remote.size} 道，种子 ${dishes.length} 道`);

const toRow = (d, id) => ({
  ...(id ? {} : { id: `dish_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` }),
  name: d.name,
  category: d.category,
  description: d.desc ?? "",
  cover_url: d.coverUrl ?? "",
  source: d.source ?? "",
  ingredients: d.ingredients ?? [],
  steps: d.steps ?? [],
  tags: d.tags ?? [],
  spicy_level: d.spicyLevel ?? 0,
});

// 2. 更新已存在的（仅当内容有变化才 PATCH）
let updated = 0;
for (const d of dishes.filter((x) => remote.has(x.name))) {
  const row = toRow(d, remote.get(d.name));
  const res2 = await fetch(`${base}/dishes?id=eq.${encodeURIComponent(remote.get(d.name))}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(row),
  });
  if (!res2.ok) {
    console.error(`更新失败：${d.name}`, res2.status, (await res2.text()).slice(0, 120));
  } else updated++;
}
console.log(`更新 ${updated} 道`);

// 3. 插入新增的（分批）
const fresh = dishes.filter((x) => !remote.has(x.name));
for (let i = 0; i < fresh.length; i += 20) {
  const batch = fresh.slice(i, i + 20).map((d) => toRow(d, null));
  const res3 = await fetch(`${base}/dishes`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(batch),
  });
  if (!res3.ok) {
    console.error(`插入批次 ${i} 失败`, res3.status, (await res3.text()).slice(0, 200));
    process.exit(1);
  }
}
console.log(`新增 ${fresh.length} 道`);
console.log(`完成：线上共 ${remote.size + fresh.length} 道菜`);

const noCover = dishes.filter((d) => !d.coverUrl);
if (noCover.length) {
  console.log(`待配图 ${noCover.length} 道（等图片上传后重跑本脚本回填）`);
}
