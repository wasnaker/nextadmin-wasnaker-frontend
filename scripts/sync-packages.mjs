// Paket @wasnaker/* = source-TS di luar host (wasnaker-modules/*). npm
// meng-copy isinya ke node_modules saat install; sync ini memastikan
// node_modules/@wasnaker/* SELALU segaris dengan source terbaru sebelum build.
// Dipanggil via "prebuild" (dan "predev").
import { execSync } from "node:child_process";
import { cpSync, existsSync } from "node:fs";

const PKGS = {
  "@wasnaker/web-core": "../../wasnaker-modules/core",
  "@wasnaker/customers-web": "../../wasnaker-modules/customers",
};

for (const [name, src] of Object.entries(PKGS)) {
  if (!existsSync(src)) {
    console.warn(`sync-packages: source ${src} tidak ada — skip ${name}`);
    continue;
  }
  cpSync(src, `node_modules/${name}`, { recursive: true, force: true });
  console.log(`sync-packages: ${name} <- ${src}`);
}