/**
 * 合并全部种子菜谱文件并校验：
 * db/seed/dishes.json + db/seed/dishes-*.json
 * 用法：import { loadSeedDishes } from "./seed-data.mjs";
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedDir = resolve(root, "db/seed");

const CATEGORIES = ["荤菜", "素菜", "汤羹", "主食", "凉菜"];

export function loadSeedDishes() {
  const files = ["dishes.json"]
    .concat(
      readdirSync(seedDir)
        .filter((f) => /^dishes-.+\.json$/.test(f))
        .sort(),
    )
    .map((f) => join(seedDir, f));

  const seen = new Map();
  const errors = [];
  let sort = 0;

  for (const file of files) {
    const list = JSON.parse(readFileSync(file, "utf8"));
    for (const d of list) {
      if (seen.has(d.name)) {
        errors.push(`重名菜「${d.name}」（${file}，与 ${seen.get(d.name)} 冲突）`);
        continue;
      }
      if (!CATEGORIES.includes(d.category)) {
        errors.push(`「${d.name}」分类非法：${d.category}`);
        continue;
      }
      const spicy = Number(d.spicyLevel ?? 0);
      if (!Number.isInteger(spicy) || spicy < 0 || spicy > 3) {
        errors.push(`「${d.name}」辣度非法：${d.spicyLevel}`);
        continue;
      }
      if (!Array.isArray(d.ingredients) || !Array.isArray(d.steps) || !d.steps.length) {
        errors.push(`「${d.name}」缺食材或步骤`);
        continue;
      }
      seen.set(d.name, file);
      seen.set(d.name, { ...d, coverUrl: d.coverUrl ?? "", sort: sort++ });
    }
  }

  if (errors.length) {
    console.error(`种子数据校验失败 ${errors.length} 项：\n` + errors.join("\n"));
    process.exit(1);
  }

  return [...seen.values()];
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("seed-data.mjs")) {
  const list = loadSeedDishes();
  const byCat = {};
  for (const d of list) byCat[d.category] = (byCat[d.category] ?? 0) + 1;
  const sourced = list.filter((d) => d.source);
  console.log(`共 ${list.length} 道：` + Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join("、"));
  console.log(`带来源标注 ${sourced.length} 道（${[...new Set(sourced.map((d) => d.source))].join("、")}）`);
}
