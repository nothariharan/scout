/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets CI/verification build alongside a running local dev server without
  // sharing stale generated artifacts.
  distDir: process.env.SCOUT_NEXT_DIST_DIR || '.next',
  // @scout/contracts ships .js + .d.ts; transpile so Next resolves the workspace pkg.
  transpilePackages: ['@scout/contracts'],
};

export default nextConfig;
