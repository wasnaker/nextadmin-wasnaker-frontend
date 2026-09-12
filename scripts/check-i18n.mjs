// Cek: semua kunci t("...") yang dipakai harus ada di kamus id/ko/ja/zh.
// Jalankan: node scripts/check-i18n.mjs
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
const fe = new URL("..", import.meta.url).pathname;
const used = new Set();
for (const f of globSync(fe + "src/**/*.{ts,tsx}")) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\\.)*)"\s*\)/g)) used.add(m[1]);
}
const dict = readFileSync(fe + "src/core/i18n/dict.ts", "utf8");
let fail = false;
for (const loc of ["id", "ko", "ja", "zh"]) {
  const m = dict.match(new RegExp(`const ${loc}: Dict = \\{([\\s\\S]*?)\\n\\};`));
  const have = new Set([...m[1].matchAll(/^\s*"((?:[^"\\]|\\\.)*)":/gm)].map((x) => x[1]));
  const miss = [...used].filter((k) => !have.has(k));
  if (miss.length) { fail = true; console.log(loc + " kurang:", miss.join(", ")); }
}
process.exit(fail ? 1 : 0);
