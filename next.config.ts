import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Paket @wasnaker/* = source-TS di luar host (wasnaker-modules/), di-declare
  // sebagai file: dependency → npm menyalin ke node_modules (path murni, tanpa
  // symlink — Turbopack menolak symlink). scripts/sync-packages.mjs (prebuild/
  // predev) menyelaraskan copy dengan source terbaru sebelum build.
  transpilePackages: ["@wasnaker/web-core", "@wasnaker/customers-web", "@wasnaker/region-web", "@wasnaker/vat-web", "@wasnaker/surveyor-web", "@wasnaker/association-web", "@wasnaker/agency-web", "@wasnaker/home-web"],
};

export default nextConfig;
