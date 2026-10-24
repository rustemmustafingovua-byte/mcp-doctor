/**
 * mcp-doctor — health check for MCP servers.
 *
 * Probes a server (stdio or streamable HTTP), lists its tools, measures
 * latency and classifies why it failed: bad command, missing key, wrong URL,
 * handshake error, timeout.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

export const FAILURE = {
  SPAWN: "cannot start the server process",
  HANDSHAKE: "the server did not complete the MCP handshake",
  TIMEOUT: "the server did not answer in time",
  AUTH: "the server rejected the credentials",
  EMPTY: "the server exposes no tools",
  OK: "ok",
}

export function classify(err) {
  const text = String(err?.message ?? err ?? "")
  if (/ENOENT|not found|command not found|spawn/i.test(text)) return FAILURE.SPAWN
  if (/401|403|unauthorized|forbidden|unauthenticated/i.test(text)) return FAILURE.AUTH
  if (/timeout|timed out|abort/i.test(text)) return FAILURE.TIMEOUT
  if (/handshake|initialize|protocol/i.test(text)) return FAILURE.HANDSHAKE
  return FAILURE.HANDSHAKE
}

/** Describe a server entry from an OpenCode-style config or servers.json fleet file. */
export function normalizeServer(name, entry) {
  if (typeof entry === "string") return { name, type: "remote", url: entry }
  if (entry?.url) return { name: entry.name || name, type: "remote", url: entry.url, headers: entry.headers }
  if (entry?.command) {
    const command = Array.isArray(entry.command)
      ? [...entry.command, ...(entry.args || [])]
      : [entry.command, ...(entry.args || [])]
    return { name: entry.name || name, type: "local", command, args: entry.args, env: entry.env, cwd: entry.cwd }
  }
  return { name: entry?.name || name, type: "unknown" }
}

/**
 * Probe one server.
 * @param {object} server normalized server
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 */
export async function probe(server, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000
  const started = Date.now()
  let transport
  try {
    if (server.type === "remote") {
      transport = new StreamableHTTPClientTransport(new URL(server.url), {
        requestInit: { headers: server.headers },
      })
    } else if (server.type === "local") {
      const [command, ...args] = server.command || []
      transport = new StdioClientTransport({
        command,
        args,
        env: { ...(process.env ?? {}), ...(server.env || {}) },
        cwd: server.cwd || process.cwd(),
        stderr: "ignore",
      })
    } else {
      throw new Error("invalid server configuration")
    }
    const client = new Client({ name: "mcp-doctor", version: "0.1.0" }, { capabilities: {} })
    const connect = client.connect(transport)
    const timer = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout: no answer in " + timeoutMs + "ms")), timeoutMs),
    )
    await Promise.race([connect, timer])
    const listed = await client.listTools()
    const tools = listed.tools || []
    const latencyMs = Date.now() - started
    await client.close().catch(() => {})
    const problem = tools.length === 0 ? FAILURE.EMPTY : null
    return {
      name: server.name,
      type: server.type,
      ok: !problem,
      problem,
      tools: tools.length,
      toolNames: tools.map((t) => t.name),
      latencyMs,
    }
  } catch (err) {
    return {
      name: server.name,
      type: server.type,
      ok: false,
      problem: classify(err),
      error: String(err?.message ?? err).slice(0, 300),
      tools: 0,
      toolNames: [],
      latencyMs: Date.now() - started,
    }
  }
}

/** Probe many servers, in parallel. */
export async function doctor(servers, opts = {}) {
  const results = await Promise.all(servers.map((s) => probe(s, opts)))
  const healthy = results.filter((r) => r.ok).length
  return {
    total: results.length,
    healthy,
    broken: results.length - healthy,
    results,
    summary: results.map((r) => `${r.ok ? "✓" : "✗"} ${r.name} — ${r.ok ? r.tools + " tools, " + r.latencyMs + "ms" : r.problem}`),
  }
}

/** Read servers out of an OpenCode-style config object or a fleet servers.json file. */
export function serversFromConfig(config) {
  if (!config || typeof config !== "object") return []
  if (Array.isArray(config)) {
    return config
      .filter((v) => v && v.enabled !== false)
      .map((v, i) => normalizeServer(v?.name || (typeof v === "string" ? v : `server-${i + 1}`), v))
  }
  if (Array.isArray(config.servers)) return serversFromConfig(config.servers)
  const map = config.mcp || config.mcpServers || config.servers || config
  return Object.entries(map)
    .filter(([, v]) => v && (typeof v === "string" || (typeof v === "object" && v.enabled !== false)))
    .map(([name, v]) => normalizeServer(name, v))
}
