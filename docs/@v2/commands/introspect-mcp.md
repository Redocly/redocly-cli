# `introspect-mcp`

The `introspect-mcp` command introspects a running MCP (Model Context Protocol) server and records what it found in the [`x-mcp` extension](https://redocly.com/docs/realm/content/api-docs/openapi-extensions/x-mcp) of an OpenAPI description.
The command connects to the server over Streamable HTTP, lists its tools, prompts, and resources, and writes them — together with the server capabilities and the negotiated protocol version — into the description file.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, command, flags, and output may change in future releases.
{% /admonition %}

## How it works

If the output file doesn't exist, the command creates a minimal OpenAPI 3.1 description scaffolded from the server's implementation info and instructions — review and complete the `info` section afterward.
If the file exists, the command updates it in place:

- The server URL is appended to `servers` unless it's already listed.
- The `x-mcp` lists are replaced with what the server reports now, so renamed or removed entries don't linger.
- Documentation-only annotations that the MCP protocol doesn't carry are preserved by entry name: `tags` and `security` on tools, prompts, and resources, and `example` on prompt arguments.

Everything else in the description stays untouched, so you can keep documenting the API around the generated `x-mcp` section.

## Usage

```bash
redocly introspect-mcp <server-url>
redocly introspect-mcp <server-url> --output <file>
redocly introspect-mcp <server-url> -H "Authorization: Bearer <token>"
```

## Options

| Option       | Type     | Description                                                                                                          |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------- |
| server-url   | string   | **REQUIRED.** URL of the MCP server (Streamable HTTP endpoint).                                                      |
| --output, -o | string   | OpenAPI description file to create or update. Default value is `openapi.yaml`. A `.json` file is written as JSON.    |
| --header, -H | [string] | Header sent with every request to the MCP server, in `"Name: value"` format. Repeat the option for multiple headers. |
| --config     | string   | Specify path to the [configuration file](../configuration/index.md).                                                 |
| --help       | boolean  | Display help.                                                                                                        |
| --version    | boolean  | Display version number.                                                                                              |

## Examples

### Document an MCP server in an OpenAPI description

The same command creates the file on the first run and refreshes it afterward,
keeping the `tags`, `security`, and prompt argument `example` annotations you added by hand:

```bash
redocly introspect-mcp https://example.com/mcp --output api/openapi.yaml
```

### Introspect a server that requires authentication

```bash
redocly introspect-mcp https://example.com/mcp -H "Authorization: Bearer $MCP_TOKEN"
```

## Related resources

- [The `x-mcp` extension reference](https://redocly.com/docs/realm/content/api-docs/openapi-extensions/x-mcp) describes every field the command writes.
