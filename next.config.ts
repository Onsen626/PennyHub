import type { NextConfig } from "next"
const nextConfig: NextConfig = {
  distDir: process.env.PENNY_NEXT_DIST_DIR || ".next",
  outputFileTracingExcludes: { "/*": ["./.pennyagent/**/*"] },
  outputFileTracingIncludes: {
    "/api/native-catalog": [
      "./scripts/strix-catalog.py",
      "./third_party/strix/STRIX_COMMIT",
      "./third_party/strix/pyproject.toml",
      "./third_party/strix/strix/skills/**/*.md",
      "./third_party/strix/strix/tools/**/*.py",
      "./third_party/strix/strix/agents/factory.py",
    ],
    "/api/pentests/*/start": ["./scripts/strix-worker.py"],
  },
}
export default nextConfig
