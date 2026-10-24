<div align="center">

<img src="docs/social-preview.png" alt="mcp-doctor" width="100%">

# mcp-doctor

**Check that your MCP servers actually work — and say why they do not.**

[![CI](https://github.com/rustemmustafingovua-byte/mcp-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/rustemmustafingovua-byte/mcp-doctor/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mcp-doctor?color=cb3837&logo=npm)](https://www.npmjs.com/package/mcp-doctor)
[![license](https://img.shields.io/badge/license-MIT-8b949e?logo=opensourceinitiative)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-3c873a?logo=node.js)](https://nodejs.org)
[![paid](https://img.shields.io/badge/USDC-0x8aC6a229f254980CCd3Dd35CF5E1B7c08880B40E-2775ca?logo=ethereum)](https://base.org)

[**Docs**](https://rustemmustafingovua-byte.github.io/mcp-doctor/) · [Issues](https://github.com/rustemmustafingovua-byte/mcp-doctor/issues) · [Discussions](https://github.com/rustemmustafingovua-byte/mcp-doctor/discussions)

</div>

---

MCP servers break silently: a wrong command, an expired key, a moved URL — and your agent just stops calling tools. mcp-doctor probes every server you configured, lists its tools, measures latency and tells you exactly what broke and how to fix it.

## Install

```bash
npm i -g mcp-doctor
```

<details>
<summary>Без npm-логина — из tarball релиза</summary>

```bash
npm i -g https://github.com/rustemmustafingovua-byte/mcp-doctor/releases/download/v0.1.0/mcp-doctor-0.1.0.tgz
```

</details>
## What it does

| | |
|---|---|
| **Probes stdio and streamable-HTTP servers** | starts the process, completes the MCP handshake, lists the tools |
| **Classifies the failure** | spawn / handshake / timeout / auth / empty — not a stack trace |
| **Reads your OpenCode config** | every enabled server in one pass, with latency |
| **Machine readable** | --json for CI |


## Usage

```bash
mcp-doctor
mcp-doctor --servers servers.json
mcp-doctor --url https://example.com/mcp
mcp-doctor --json
```

## CLI

```
mcp-doctor — Health check for MCP servers.

USAGE
  mcp-doctor                          read ~/.config/opencode/opencode.jsonc
  mcp-doctor --servers servers.json   probe every server in a JSON file
  mcp-doctor --url https://host/mcp   probe one remote server
  mcp-doctor --cmd "npx -y server"    probe one stdio server

COMMANDS / OPTIONS
  --servers <file> JSON file of servers to probe
  --config <path>  config file to read
  --url <url>      probe a single remote MCP server
  --cmd <command>  probe a single stdio MCP server
  --timeout <ms>   handshake timeout (default 15000)
  --json           machine-readable output

Exit code 1 when at least one server is broken.

MIT · https://github.com/rustemmustafingovua-byte
```

## Part of a portfolio

| Project | What it does |
|---|---|
| [`opencode-free-stack`](https://github.com/rustemmustafingovua-byte/opencode-free-stack) | route to free models, fall back automatically |
| [`free-web-mcp`](https://github.com/rustemmustafingovua-byte/free-web-mcp) | web search for agents, zero credits |
| [`agent-x402`](https://github.com/rustemmustafingovua-byte/agent-x402) | pay per API call in USDC with a spend policy |

## Donate

MIT, forever. USDC on Base:

```
0x8aC6a229f254980CCd3Dd35CF5E1B7c08880B40E
```

## Support

Every tool here is MIT and free. If it saved you time, you can support the work:

- **USDC (Base):** `0x8aC6a229f254980CCd3Dd35CF5E1B7c08880B40E`
- **GitHub Sponsors:** https://github.com/sponsors/rustemmustafingovua-byte

Paid tiers of the hosted services are billed per call in USDC (x402) — no accounts, no keys.

## License

MIT © rustemmustafingovua-byte
