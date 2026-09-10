---
'@redocly/cli': minor
---

Added an experimental `introspect-mcp` command that analyzes a running MCP server and records its tools, prompts, resources, and capabilities.
`introspect-mcp` records its findings in the `x-mcp` extension of an OpenAPI description.
The command connects over Streamable HTTP (with a fallback to the legacy HTTP+SSE transport) or starts a local stdio server with `--command`, and `--check` verifies the description is still in sync with the server, for CI.
