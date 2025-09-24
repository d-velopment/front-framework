# Front-End-based Full-Stack Framework

A lightweight front-end based full-stack framework for building modular applications.  
This framework provides a simple way to structure, render, and bundle front-end applications with TypeScript as the entry point and HTML as the host.  
It also lets you seamlessly write both front-end and back-end logic inside `src/index.ts`:  
all functions marked with `$api` are automatically converted into API endpoints and integrated into the server application.

---

## Features

- **TypeScript first**: Build your application starting from `src/index.ts`.
- **HTML host**: Use `public/index.html` as the entry container for your app.
- **Unified client and server code**: Write both in one place, `$api` functions become server endpoints.
- **Framework utilities**: Provides a rendering pipeline and modular structure to grow your project.
- **Build system**: Includes scripts to bundle, copy assets, and prepare for deployment.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- npm or yarn as a package manager

---

### Installation

Clone this repository and run: 
```bash
npm install
```

---

### Project Structure

```
front-framework/
│
├── src/
│   └── index.ts         # Your application entry point
│
├── public/
│   └── index.html       # Host HTML file
│   └── server/server.js # Default Server to be started
│
├── dist/                # Built output (inc. client and server applications)
├── scripts/             # Build and dev scripts
├── package.json
└── README.md
```

---

## Usage

### Development
Run the development server with hot reload:

```bash
npm run dev
```

This will:
- Watch `src/` for changes
- Rebuild automatically on save
- Serve on `http://localhost:3000`

### Build
Compile the app for production:

```bash
npm run build
```

The output will be placed into the `dist/` folder.  
It includes the bundled JavaScript and a copy of your `public/index.html` and `public/server/server.js`.

---

## Example: Minimal Application

**src/index.ts**
```ts
import { $api } from "../framework/api"

// Client function to be executed in browser
function helloClient(name: string) {
  console.log("[client] hello,", name)
  return `client says hi to ${name}`
}

// Server function - $api part would automatically be converted into server side API endpoint
const helloServer = $api<{ name: string }, { ok: true }>(
  "helloServer",
  async props => {
    console.log("[server] hello,", props.name)
    return { ok: true }
  }
)

// Application
async function main() {
  // This part would stay as-is and executed in browser
  const a = helloClient("Dmitry")
  console.log("helloClient returned:", a)

  // This part would automatically be converted into API request
  const b = await helloServer({ name: "Dmitry" })
  console.log("helloServer returned:", b)
}

main()
console.log("Program started!")
```

Run `npm run dev` and open `http://localhost:3000` in your browser.

---

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build project to `dist/`

---

## License

MIT