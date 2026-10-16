import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@outfit/config", "@outfit/db", "@outfit/domain"]
};

export default nextConfig;
