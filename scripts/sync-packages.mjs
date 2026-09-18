// Paket @wasnaker/* = source-TS di luar host (wasnaker-modules/*). npm
// meng-copy isinya ke node_modules saat install; sync ini memastikan
// node_modules/@wasnaker/* SELALU segaris dengan source terbaru sebelum build.
// Hanya sync src/ + file puncak (package.json, tsconfig, README) — SKIP .git,
// node_modules, dist, dst. Dipanggil via "prebuild"/"predev".
import { cpSync, existsSync, rmSync } from "node:fs";

const PKGS = {
  "@wasnaker/web-core": "../../wasnaker-modules/core",
  "@wasnaker/customers-web": "../../wasnaker-modules/customers",
  "@wasnaker/region-web": "../../wasnaker-modules/region",
  "@wasnaker/vat-web": "../../wasnaker-modules/vats",
  "@wasnaker/surveyor-web": "../../wasnaker-modules/surveyor",
  "@wasnaker/association-web": "../../wasnaker-modules/association",
  "@wasnaker/connect-web": "../../wasnaker-modules/connect",
  "@wasnaker/connections-web": "../../wasnaker-modules/connections",
  "@wasnaker/equipment-categories-web": "../../wasnaker-modules/equipment-categories",
  "@wasnaker/agency-web": "../../wasnaker-modules/agency",
  "@wasnaker/home-web": "../../wasnaker-modules/home",
};

const TOP_FILES = new Set(["package.json", "tsconfig.json", "README.md"]);

for (const [name, src] of Object.entries(PKGS)) {
  const dest = `node_modules/${name}`;
  if (!existsSync(src)) {
    console.warn(`sync-packages: source ${src} tidak ada — skip ${name}`);
    continue;
  }
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