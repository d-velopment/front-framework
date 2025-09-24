// public/server/server.js
import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { routes } from "./manifest.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

const clientDir = path.join(__dirname, "../client")
app.use(express.static(clientDir))

for (const r of routes) {
  const modPath = path.join(__dirname, r.handlerPath)
  const mod = await import(modPath)
  app.post(`/api/_rpc/${r.id}`, async (req, res) => {
    try {
      const result = await mod.handler(req.body)
      res.json(result)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: "server error" })
    }
  })
}

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"))
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen(PORT, () => console.log("http://localhost:" + PORT))