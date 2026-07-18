/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @scout/contracts ships .js + .d.ts; transpile so Next resolves the workspace pkg.
  transpilePackages: ['@scout/contracts'],
};

export default nextConfig;
