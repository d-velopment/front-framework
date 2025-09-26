import { $api } from "../framework/api"

// Client function
const helloClient = (name: string) => {
  console.log("[client] hello,", name)
  return `client says hi to ${name}`
}

// Server function
const helloServer = $api<{ name: string }, { ok: true }>(
  "helloServer",
  async props => {
    console.log("[server] hello,", props.name)
    return { ok: true }
  }
)

// Application
async function main() {
  const a = helloClient("Dmitry")
  console.log("helloClient returned:", a)

  const b = await helloServer({ name: "Dmitry" })
  console.log("helloServer returned:", b)
}

main()
console.log("Program started!")
