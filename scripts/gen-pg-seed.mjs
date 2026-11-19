/**
 * 生成 PostgreSQL 模式的菜谱种子 SQL：node scripts/gen-pg-seed.mjs
 * 产物 db/pg/seed-dishes.sql，可用控制台 SQL 编辑器执行，或
 * tcb db execute -e <envId> --file ./db/pg/seed-dishes.sql
 * 按菜名去重（on conflict (name) do nothing），可重复执行。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedDishes } from "./seed-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dishes = loadSeedDishes();

const esc = (v) => String(v ?? "").replace(/'/g, "''");
const arr = (list) =>
  `'${JSON.stringify(list ?? []).replace(/'/g, "''")}'::jsonb`;

const now = Date.now();
const lines = [
  "-- 自动生成：node scripts/gen-pg-seed.mjs（幂等，按菜名去重）",
  "create table if not exists public.dishes (",
  "  id text primary key, name text not null, category text not null default '荤菜',",
  "  description text not null default '', cover_url text not null default '',",
  "  source text not null default '',",
  "  ingredients jsonb not null default '[]'::jsonb, steps jsonb not null default '[]'::jsonb,",
  "  tags jsonb not null default '[]'::jsonb, spicy_level integer not null default 0,",
  "  available boolean not null default true, sort integer not null default 0,",
  "  created_at bigint not null default 0",
  ");",
  "create unique index if not exists dishes_name_uniq on public.dishes (name);",
  "",
];

dishes.forEach((d, i) => {
  const id = `dish_${String(i + 1).padStart(3, "0")}`;
  lines.push(
    `insert into public.dishes (id, name, category, description, cover_url, source, ingredients, steps, tags, spicy_level, available, sort, created_at) values (` +
      `'${id}', '${esc(d.name)}', '${esc(d.category)}', '${esc(d.desc)}', '${esc(d.coverUrl ?? "")}', '${esc(d.source ?? "")}', ` +
      `${arr(d.ingredients)}, ${arr(d.steps)}, ${arr(d.tags)}, ${d.spicyLevel ?? 0}, true, ${i}, ${now - (dishes.length - i) * 1000}` +
      `) on conflict (name) do nothing;`,
  );
});

const out = resolve(root, "db/pg/seed-dishes.sql");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log(`已生成 ${out}，共 ${dishes.length} 道菜`);
