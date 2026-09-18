import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Paket @wasnaker/* = source-TS di luar host (wasnaker-modules/), di-declare
  // sebagai file: dependency → npm menyalin ke node_modules (path murni, tanpa
  // symlink — Turbopack menolak symlink). scripts/sync-packages.mjs (prebuild/
  // predev) menyelaraskan copy dengan source terbaru sebelum build.
  transpilePackages: ["@wasnaker/web-core", "@wasnaker/customers-web", "@wasnaker/region-web", "@wasnaker/vat-web", "@wasnaker/surveyor-web", "@wasnaker/association-web", "@wasnaker/agency-web", "@wasnaker/home-web", "@wasnaker/connect-web", "@wasnaker/connections-web", "@wasnaker/equipment-categories-web", "@wasnaker/equipment-groups-web", "@wasnaker/equipment-subgroups-web", "@wasnaker/equipments-web", "@wasnaker/my-equipment-web", "@wasnaker/plans-web", "@wasnaker/referrals-web", "@wasnaker/rfqs-web", "@wasnaker/roles-web", "@wasnaker/settings-web", "@wasnaker/users-web", "@wasnaker/workflows-web", "@wasnaker/platform-web"],
};

export default nextConfig;
