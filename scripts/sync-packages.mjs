// Paket @wasnaker/* = source-TS di luar host (wasnaker-modules/*). npm
// meng-copy isinya ke node_modules saat install; sync ini memastikan
// node_modules/@wasnaker/* SELALU segaris dengan source terbaru sebelum build.
// Hanya sync src/ + file puncak (package.json, tsconfig, README) — SKIP .git,
// node_modules, dist, dst. Dipanggil via "prebuild"/"predev".
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const PKGS = {
  "@wasnaker/web-core": "../../wasnaker-modules/core",
  "@wasnaker/customers-web": "../../wasnaker-modules/customers",
};

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next"]);
const TOP_FILES = new Set(["package.json", "tsconfig.json", "README.md"]);

for (const [name, src] of Object.entries(PKGS)) {
  const dest = `node_modules/${name}`;
  if (!existsSync(src)) {
    console.warn(`sync-packages: source ${src} tidak ada — skip ${name}`);
    continue;
  }
  // hapus dest agar tidak ada sisa lama
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (p) => {
      if (p === src) return true;
      const rel = p.slice(src.length + 1);
      const parts = rel.split("/");
      if (parts[0] === "src") return true; // seluruh src/ ikut
      if (parts.length === 1 && TOP_FILES.has(parts[0])) return true; // file puncak
      return false;
    },
  });
  console.log(`sync-packages: ${name} <- ${src} (src + file puncak, tanpa .git)`);
}