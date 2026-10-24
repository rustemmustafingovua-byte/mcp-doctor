#!/usr/bin/env node
/**
 * mcp-doctor — check that your MCP servers actually work.
 *
 *   mcp-doctor                        read ~/.config/opencode/opencode.jsonc
 *   mcp-doctor --servers servers.json probe every server in a JSON file
 *   mcp-doctor --url https://...      probe one remote server
 *   mcp-doctor --cmd "npx -y server"  probe one stdio server
 *   mcp-doctor --json                 machine-readable output
 */
import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { doctor, normalizeServer, serversFromConfig } from "../src/index.js"

// --- CLI shell: --help / --version -------------------------------------------
const HELP = "mcp-doctor — Health check for MCP servers.\n\nUSAGE\n  mcp-doctor                          read ~/.config/opencode/opencode.jsonc\n  mcp-doctor --servers servers.json   probe every server in a JSON file\n  mcp-doctor --url https://host/mcp   probe one remote server\n  mcp-doctor --cmd \"npx -y server\"    probe one stdio server\n\nCOMMANDS / OPTIONS\n  --servers <file> JSON file of servers to probe\n  --config <path>  config file to read\n  --url <url>      probe a single remote MCP server\n  --cmd <command>  probe a single stdio MCP server\n  --timeout <ms>   handshake timeout (default 15000)\n  --json           machine-readable output\n\nExit code 1 when at least one server is broken.\n\nMIT · https://github.com/rustemmustafingovua-byte"
const VERSION = "0.1.0"
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(HELP)
  process.exit(0)
}
if (process.argv.includes("--version") || process.argv.includes("-V")) {
  console.log(VERSION)
  process.exit(0)
}


const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

const serversPath = arg("--servers")
const cfgPath = arg("--config") || join(homedir(), ".config", "opencode", "opencode.jsonc")
let servers = []
if (serversPath) {
  if (!existsSync(serversPath)) {
    console.error(`servers file not found: ${serversPath}`)
    process.exit(2)
  }
  const raw = readFileSync(serversPath, "utf8").replace(/^\s*\/\/.*$/gm, "")
  servers = serversFromConfig(JSON.parse(raw))
} else if (arg("--url")) {
  servers = [normalizeServer("remote", { url: arg("--url") })]
} else if (arg("--cmd")) {
  servers = [normalizeServer("stdio", { command: arg("--cmd").split(/\s+/) })]
} else if (existsSync(cfgPath)) {
  const raw = readFileSync(cfgPath, "utf8").replace(/^\s*\/\/.*$/gm, "")
  const cfg = JSON.parse(raw)
  servers = serversFromConfig(cfg)
}

if (!servers.length) {
  console.error("no MCP servers found — pass --servers, --url or --cmd, or point --config at your config")
  process.exit(2)
}

const report = await doctor(servers, { timeoutMs: Number(arg("--timeout") || 15000) })

if (argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2))
  if (report.broken) process.exitCode = 1
} else {
  console.log(`\nchecked ${report.total} server(s): ${report.healthy} healthy, ${report.broken} broken\n`)
  for (const r of report.results) {
    if (r.ok) {
      console.log(`  ✓ ${r.name}  ${r.tools} tools  ${r.latencyMs}ms`)
      if (r.toolNames.length) console.log(`      ${r.toolNames.slice(0, 8).join(", ")}${r.toolNames.length > 8 ? " …" : ""}`)
    } else {
      console.log(`  ✗ ${r.name}  ${r.problem}${r.error ? " — " + r.error : ""}`)
    }
  }
  if (report.broken) {
    console.log(`\n${report.broken} server(s) need attention`)
    process.exitCode = 1
  }
}
