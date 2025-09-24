// scripts/bundle-client.ts
import { build } from "esbuild"
import path from "node:path"
import fs from "node:fs"

const entry = path.resolve("dist/client/main.js")
const outfile = path.resolve("dist/client/bundle.js")

if (!fs.existsSync(entry)) {
  console.error("[bundle] no dist/client/main.js. Run build first")
  process.exit(1)
}

await build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile,
  sourcemap: true,
  logLevel: "info"
})

console.log("[bundle] dist/client/bundle.js ready")

try {
  fs.rmSync(entry)
  fs.rmSync(path.resolve("dist/client/proxies"), { recursive: true, force: true })
  console.log("[bundle] cleaned up main.js and proxies/")
} catch {}