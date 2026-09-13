import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Paket source-TS di luar host, di-symlink ke node_modules/@wasnaker/*
  // (pola monorepo resmi Next) — Turbopack compile via transpilePackages.
  transpilePackages: ["@wasnaker/web-core", "@wasnaker/customers-web"],
};

export default nextConfig;
