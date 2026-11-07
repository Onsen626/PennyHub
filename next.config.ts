import type { NextConfig } from "next"
const nextConfig: NextConfig = {
  distDir: process.env.PENNY_NEXT_DIST_DIR || ".next",
  outputFileTracingExcludes: { "/*": ["./.pennyagent/**/*"] },
  outputFileTracingIncludes: {
    "/api/pentests/*/start": ["./scripts/strix-worker.py"],
  },
}
export default nextConfig
