/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@adltix/database", "@adltix/ui", "@adltix/utils"],
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;
