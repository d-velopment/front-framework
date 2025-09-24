// scripts/dev.js
import { spawn } from "node:child_process"
import chokidar from "chokidar"
import path from "node:path"

let srv = null
let busy = false
let latestToken = 0
let rebuildTimer = null

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" })
    p.on("exit", code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> ${code}`)))
  })
}

async function buildAll(token) {
  if (busy) { return }
  busy = true
  try {
    await run("tsx", ["scripts/build.ts"])
    await run("tsx", ["scripts/bundle-client.ts"])
    restartServer()
  } catch (e) {
    console.error("[dev] build failed:", e)
  } finally {
    busy = false
    if (token !== latestToken) {
      buildAll(latestToken)
    }
  }
}

function restartServer() {
  if (srv) {
    srv.kill()
    srv = null
  }
  srv = spawn("node", ["dist/server/server.js"], { stdio: "inherit", shell: process.platform === "win32" })
}

async function main() {
  latestToken++
  await buildAll(latestToken)
  const watchPaths = [path.resolve("src"), path.resolve("framework")]
  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 50 },
    ignored: [/\.swp$/, /~$/, /\.tmp$/, /\.DS_Store$/, /node_modules/, /^dist\//]
  })
  watcher.on("change", (_event, filePath) => {
    if (rebuildTimer !== null) clearTimeout(rebuildTimer)
    latestToken++
    const token = latestToken
    console.log("[dev] rebuild initiated")
    rebuildTimer = setTimeout(() => {
      buildAll(token)
      rebuildTimer = null
    }, 400)
  })
  console.log("[dev] watching src and framework")
}

main().catch(e => { console.error(e); process.exit(1) })
