// scripts/build.ts
import ts from "typescript"
import fs from "node:fs"
import path from "node:path"

const ENTRY = path.resolve("src/index.ts")
const OUT_ROOT = path.resolve("dist")
const OUT_SERVER = path.join(OUT_ROOT, "server")
const OUT_CLIENT = path.join(OUT_ROOT, "client")

type RouteRec = {
	id: string
	varName: string
	handlerPath: string
	clientPath: string
}
const routes: RouteRec[] = []

run().catch(e => {
	console.error(e)
	process.exit(1)
})

async function run() {
	cleanDir(OUT_ROOT)
	ensureDir(OUT_SERVER)
	ensureDir(OUT_CLIENT)

	const program = ts.createProgram([ENTRY], {
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ESNext,
		strict: true
	})

	const sf = program.getSourceFile(ENTRY)
	if (!sf) throw new Error("Cannot read src/index.ts")

	collectApiCalls(sf)

	// client main.js
	const clientJs = makeClientMain(sf)
	fs.writeFileSync(path.join(OUT_CLIENT, "main.js"), clientJs, "utf8")

	// server manifest
	const manifestJs = `export const routes = ${JSON.stringify(
		routes.map(r => ({
			id: r.id,
			handlerPath: r.handlerPath,
			clientPath: r.clientPath
		})),
		null,
		2
	)};\n`
	fs.writeFileSync(path.join(OUT_SERVER, "manifest.js"), manifestJs, "utf8")

	// copy public/index.html → dist/client/index.html
	const publicHtml = path.resolve("public/index.html")
	const distHtml = path.join(OUT_CLIENT, "index.html")
	if (fs.existsSync(publicHtml)) {
		fs.copyFileSync(publicHtml, distHtml)
		console.log("[build] copied index.html to dist/client")
	} else {
		console.warn("[build] public/index.html not found, skipping")
	}

	// copy public/server/server.js → dist/server/server.js
	const publicServer = path.resolve("public/server/server.js")
	const distServer = path.join(OUT_SERVER, "server.js")
	if (fs.existsSync(publicServer)) {
		ensureDir(path.dirname(distServer))
		fs.copyFileSync(publicServer, distServer)
		console.log("[build] copied server.js to dist/server")
	} else {
		console.warn("[build] public/server/server.js not found, skipping")
	}

	console.log(`[build] dist/ ready, ${routes.length} route(s) generated`)
}

// ---------- helpers ----------

function collectApiCalls(sf: ts.SourceFile) {
	function visit(node: ts.Node) {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer)
		) {
			const call = node.initializer
			if (call.expression.getText(sf) === "$api" && call.arguments.length >= 2) {
				const idArg = call.arguments[0]
				const fnArg = call.arguments[1]
				if (
					ts.isStringLiteral(idArg) &&
					(ts.isFunctionExpression(fnArg) || ts.isArrowFunction(fnArg))
				) {
					const varName = node.name.text
					const id = idArg.text
					const fnText = sf.text.slice(fnArg.getFullStart(), fnArg.getEnd())

					generateArtifacts(id, fnText)

					routes.push({
						id,
						varName,
						handlerPath: `routes/${id}.js`,
						clientPath: `proxies/${id}.js`
					})
				}
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(sf)
}

function generateArtifacts(id: string, fnText: string) {
	// server handler
	const handlerRel = `routes/${id}.js`
	const handlerAbs = path.join(OUT_SERVER, handlerRel)

	// !!! sql.js to be imported into API to be available
	const serverCode =
		`//import { sql } from "../../../framework/sql.js";
export async function handler(props) {
  const impl = ${fnText};
  return await impl(props, {});
}
`
	ensureDir(path.dirname(handlerAbs))
	fs.writeFileSync(handlerAbs, serverCode, "utf8")

	// client proxy
	const clientRel = `proxies/${id}.js`
	const clientAbs = path.join(OUT_CLIENT, clientRel)
	const clientCode =
		`export async function ${safeFn(id)}(props) {
  const r = await fetch("/api/_rpc/${id}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(props ?? {})
  });
  if (!r.ok) throw new Error("API ${id} failed " + r.status);
  return r.json();
}
`
	ensureDir(path.dirname(clientAbs))
	fs.writeFileSync(clientAbs, clientCode, "utf8")
}

function makeClientMain(sf: ts.SourceFile): string {
	// isolate VariableStatement with $api
	const filtered = ts.factory.updateSourceFile(
		sf,
		sf.statements.filter(s => !isApiVarStatement(s, sf))
	)

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	let tsCode = printer.printFile(filtered)

	// framework/api -> framework/api-client
	tsCode = rewriteApiImportToClient(tsCode)

	// add proxy imports
	const proxyImports = routes
		.map(
			r =>
				`import { ${safeFn(r.id)} as ${r.varName} } from "./${toPosix(
					r.clientPath
				)}";`
		)
		.join("\n")
	tsCode = `${proxyImports}\n\n${tsCode}`

	// TS -> JS
	return ts.transpileModule(tsCode, {
		compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
	}).outputText
}

function isApiVarStatement(stmt: ts.Statement, sf: ts.SourceFile) {
	if (!ts.isVariableStatement(stmt)) return false
	for (const decl of stmt.declarationList.declarations) {
		const init = decl.initializer
		if (!init || !ts.isCallExpression(init)) continue
		if (init.expression.getText(sf) === "$api" && init.arguments.length >= 2)
			return true
	}
	return false
}

function cleanDir(dir: string) {
	if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}
function ensureDir(dir: string) {
	fs.mkdirSync(dir, { recursive: true })
}
function toPosix(p: string) {
	return p.split(path.sep).join("/")
}
function safeFn(name: string) {
	return name.replace(/[^a-zA-Z0-9_$]/g, "_")
}
function rewriteApiImportToClient(code: string) {
	return code
		.replace(
			/from\s+["'](\.\.\/)?framework\/api["']/g,
			(_m, p1) => `from "${p1 ?? ""}framework/api-client"`
		)
		.replace(
			/require\(\s*["'](\.\.\/)?framework\/api["']\s*\)/g,
			(_m, p1) => `require("${p1 ?? ""}framework/api-client")`
		)
}
