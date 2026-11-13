---
'@redocly/cli': minor
---

Added support for MCP servers of protocol version `2026-07-28` to the experimental `introspect-mcp` command.
The command falls back to the `initialize` handshake for servers of the earlier protocol versions.

**Note:** A server that supports both `2026-07-28` and an earlier protocol version is now recorded with `protocolVersion: 2026-07-28`.
If `--check` reports the description as out of date, run the command without `--check` and commit the file.
