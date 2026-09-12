// Pagar arsitektur modular — jalankan: node scripts/check-modules.mjs
// Gagal (exit 1) kalau boundary dilanggar. Lihat .hermes/plans/*frontend-modular-migration.md
import { readFileSync, globSync } from "node:fs";

const FE = new URL("..", import.meta.url).pathname;
const ROOT = FE + "src/";

// Route yang sudah dimigrasi: page.tsx-nya wajib tipis (adapter).
const MIGRATED = ["customers"];
const MAX_ADAPTER_LINES = 5;

const files = globSync(ROOT + "**/*.{ts,tsx}");
const imports = (src) =>
  [...src.matchAll(/(?:from|import\s*\()\s*["']([^"']+)["']/g)].map((m) => m[1]);

let fail = false;
const bad = (msg) => {
  fail = true;
  console.log("LANGAR:", msg);
};

for (const f of files) {
  const rel = f.slice(ROOT.length);
  const src = readFileSync(f, "utf8");
  const imps = imports(src);

  // 1. modul tidak boleh import modul lain langsung
  const own = rel.match(/^modules\/([^/]+)\//)?.[1];
  for (const i of imps) {
    const other = i.match(/@\/modules\/([^/]+)/)?.[1] ?? i.match(/(?:\.\.\/)+modules\/([^/]+)/)?.[1];
    if (own && other && other !== own)
      bad(`${rel} -> modul lain "${other}" (pakai core/ atau lib/)`);
  }

  // 2. core tidak boleh tahu modul bisnis
  if (rel.startsWith("core/") && imps.some((i) => i.startsWith("@/modules/")))
    bad(`${rel} -> core meng-import modules/*`);

  // 3. app tidak boleh ambil widget dashboard modul secara langsung
  if (rel.startsWith("app/") && imps.some((i) => i.includes("components/dashboard/widgets")))
    bad(`${rel} -> import widget spesifik (lewat core/dashboard)`);
}

// 4. route yang sudah dimigrasi harus tipis
for (const m of MIGRATED) {
  const p = ROOT + `app/(with-layouts)/${m}/page.tsx`;
  try {
    const n = readFileSync(p, "utf8").split("\n").length;
    if (n > MAX_ADAPTER_LINES) bad(`app/.../${m}/page.tsx ${n} baris (maks ${MAX_ADAPTER_LINES})`);
  } catch {
    bad(`app/.../${m}/page.tsx tidak ada (MIGRATED salah?)`);
  }
}

console.log(fail ? "check-modules: GAGAL" : `check-modules: OK (${files.length} file, ${MIGRATED.length} modul terdaftar)`);
process.exit(fail ? 1 : 0);
