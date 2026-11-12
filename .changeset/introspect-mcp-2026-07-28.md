---
'@redocly/cli': minor
---

Added support for MCP servers of protocol version `2026-07-28` to the experimental `introspect-mcp` command.
The command falls back to the `initialize` handshake for servers of the earlier protocol versions.

**Note:** For a server that supports both `2026-07-28` and an earlier version, the recorded `x-mcp.protocolVersion` changes to `2026-07-28`, so `--check` reports the description as out of date.
Run the command without `--check` to update it.
