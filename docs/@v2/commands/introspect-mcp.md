# `introspect-mcp`

The `introspect-mcp` command analyzes a running MCP (Model Context Protocol) server and records what it found in the [`x-mcp` extension](https://redocly.com/docs/realm/content/api-docs/openapi-extensions/x-mcp) of an OpenAPI description.
The command connects to the server, lists its tools, prompts, and resources together with the server capabilities and the negotiated protocol version.
Then the command writes this information into the description file.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.
{% /admonition %}

## How it works

The command reaches the MCP server in one of two ways:

- A server URL connects over Streamable HTTP, and automatically falls back to the legacy HTTP+SSE transport when the server doesn't support Streamable HTTP.
- `--command` starts a local MCP server process and talks to it over stdio.
  Most published MCP servers run this way, for example `npx -y my-mcp-server`.
  The process inherits your environment.
  Servers that read API keys from environment variables work as they do in your shell.

If the output file doesn't exist, the command creates a minimal OpenAPI 3.1 description scaffolded from the server's implementation info and instructions.
Review and complete the `info` section afterward.
If the file exists, the command updates it in place:

- The server URL is appended to `servers` unless it's already listed.
  Stdio servers have no URL, so `servers` stays untouched.
- The `x-mcp` lists are replaced with what the server reports.
  Renamed or removed entries don't linger.
- Documentation-only annotations that the MCP protocol doesn't carry are preserved by entry name: `tags` and `security` on tools, prompts, and resources, and `example` on prompt arguments.

Everything else in the description stays untouched.
You can keep documenting the API around the generated `x-mcp` section.

With `--check`, the command only compares the file with what an introspection run would produce without writing anything.
It reports the added, removed, and changed entries, and exits with code `1` when the file is out of date.
This flag is useful for CI.

## Usage

```bash
redocly introspect-mcp <server-url>
redocly introspect-mcp <server-url> --output <file>
redocly introspect-mcp <server-url> -H "Authorization: Bearer <token>"
redocly introspect-mcp --command "npx -y my-mcp-server" --output <file>
redocly introspect-mcp <server-url> --output <file> --check
```

## Options

| Option       | Type     | Description                                                                                                                                        |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| server-url   | string   | URL of the MCP server (Streamable HTTP, with a fallback to the legacy HTTP+SSE transport). Provide either a server URL or `--command`.             |
| --command    | string   | Command that starts a local MCP server to introspect over stdio, for example `"npx -y my-mcp-server"`. Provide either a server URL or this option. |
| --output, -o | string   | OpenAPI description file to create or update. Default value is `openapi.yaml`. A `.json` file is written as JSON.                                  |
| --header, -H | [string] | Header sent with every request to the MCP server, in `"Name: value"` format. Repeat the option for multiple headers. Only applies to a server URL. |
| --check      | boolean  | Verify the description is up to date with the MCP server instead of writing: report the differences and exit with code `1` when it is not.         |
| --config     | string   | Specify path to the [configuration file](../configuration/index.md).                                                                               |
| --help       | boolean  | Display help.                                                                                                                                      |
| --version    | boolean  | Display version number.                                                                                                                            |

## Examples

### Document an MCP server in an OpenAPI description

The same command creates the file on the first run and refreshes it afterward, keeping the `tags`, `security`, and prompt argument `example` annotations you added by hand:

```bash
redocly introspect-mcp https://example.com/mcp --output api/openapi.yaml
```

### Document a local stdio server

```bash
redocly introspect-mcp --command "npx -y my-mcp-server" --output api/openapi.yaml
```

### Introspect a server that requires authentication

```bash
redocly introspect-mcp https://example.com/mcp -H "Authorization: Bearer $MCP_TOKEN"
```

### Fail CI when the description is stale

`--check` compares the file with the live server without writing, and reports what drifted:

```bash
redocly introspect-mcp https://example.com/mcp --output api/openapi.yaml --check
```

```text
api/openapi.yaml is out of date with the MCP server:

  - tools - added: orders/cancel; changed: orders/create
  - protocolVersion - 2024-11-05 -> 2025-11-25

Run the command without --check to update it.
```

## Resources

- [The `x-mcp` extension reference](https://redocly.com/docs/realm/content/api-docs/openapi-extensions/x-mcp) describes every field the command writes.
