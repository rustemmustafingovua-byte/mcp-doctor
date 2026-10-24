import { test } from "node:test"
import assert from "node:assert/strict"
import { classify, normalizeServer, serversFromConfig, FAILURE } from "../src/index.js"

test("classifies the common failures", () => {
  assert.equal(classify(new Error("spawn npx ENOENT")), FAILURE.SPAWN)
  assert.equal(classify(new Error("401 Unauthorized")), FAILURE.AUTH)
  assert.equal(classify(new Error("request timed out")), FAILURE.TIMEOUT)
  assert.equal(classify(new Error("handshake failed")), FAILURE.HANDSHAKE)
})

test("normalises every config shape", () => {
  assert.equal(normalizeServer("a", "https://x/mcp").type, "remote")
  assert.equal(normalizeServer("b", { url: "https://x/mcp" }).type, "remote")
  assert.equal(normalizeServer("c", { command: ["npx", "-y", "s"] }).type, "local")
  assert.equal(normalizeServer("d", {}).type, "unknown")
})

test("reads enabled servers from a config", () => {
  const cfg = {
    mcp: {
      a: { type: "local", command: ["x"], enabled: true },
      b: { type: "local", command: ["y"], enabled: false },
      c: { type: "remote", url: "https://z/mcp" },
    },
  }
  const list = serversFromConfig(cfg)
  assert.equal(list.length, 2)
  assert.deepEqual(list.map((s) => s.name).sort(), ["a", "c"])
})

import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const BIN = join(fileURLToPath(new URL("..", import.meta.url)), "bin/mcp-doctor.js")

test("reads fleet servers from array and flat object shapes", () => {
  const fromArray = serversFromConfig([
    { name: "alpha", url: "https://a.example/mcp" },
    { name: "beta", command: ["node", "server.js"] },
  ])
  assert.equal(fromArray.length, 2)
  assert.deepEqual(fromArray.map((s) => s.name), ["alpha", "beta"])

  const fromFlat = serversFromConfig({
    one: "https://one.example/mcp",
    two: { command: ["npx", "two"] },
  })
  assert.equal(fromFlat.length, 2)
  assert.deepEqual(fromFlat.map((s) => s.name), ["one", "two"])
})

test("--servers <file> probes every entry and exits 1 when any server is broken", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcpd-"))
  const file = join(dir, "servers.json")
  writeFileSync(
    file,
    JSON.stringify([
      { name: "bad-stdio-1", command: ["nonexistent-mcp-binary-xyz"] },
      { name: "bad-stdio-2", command: ["another-missing-mcp-binary-xyz"] },
    ]),
  )
  let code = 0
  let stdout = ""
  try {
    stdout = execFileSync("node", [BIN, "--servers", file, "--timeout", "1000", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  } catch (err) {
    code = err.status
    stdout = err.stdout || ""
  }
  assert.equal(code, 1)
  const report = JSON.parse(stdout)
  assert.equal(report.total, 2)
  assert.equal(report.broken, 2)
  assert.deepEqual(
    report.results.map((r) => r.name),
    ["bad-stdio-1", "bad-stdio-2"],
  )
})
