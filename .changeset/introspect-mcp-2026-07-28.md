---
'@redocly/cli': minor
---

Added support for MCP servers of protocol version `2026-07-28` to the experimental `introspect-mcp` command.
The command falls back to the `initialize` handshake for servers of the earlier protocol versions.
