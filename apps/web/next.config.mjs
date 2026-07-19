import { fileURLToPath } from 'node:url';

// The shared local .env is intentionally loaded server-side. Only the Intake
// Agent ID route reads its public conversation identifier; API keys never
// receive a NEXT_PUBLIC_ prefix or reach the browser bundle.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // Deployment environments provide variables directly.
}

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
