# cli

The `cli` generator emits `src/api/client.cli.ts` — a bin-ready, zero-dependency command-line interface over the generated client.
Path params are positional, query params become typed `--kebab-name` flags, and JSON bodies arrive via `--json '<json>'`, `--json @file.json`, or `--json @-` (stdin).
With `zod` co-selected (as here), requests are validated before they are sent — an invalid body exits with code 3 and never reaches the network.

Commands are grouped by tag and addressed by the tag's shell-typable slug — `Products` is typed `products` — and a unique operationId also works on its own.

Generate the client, then drive the API from the shell:

```sh
npm run generate

npx tsx src/api/client.cli.ts --help
npx tsx src/api/client.cli.ts products listMenuItems --limit 3
npx tsx src/api/client.cli.ts listMenuItems --limit 3          # the group is optional when unambiguous
npx tsx src/api/client.cli.ts orders createOrder --json @order.json --dry-run
npx tsx src/api/client.cli.ts schema createOrder
```

`--dry-run` prints the prepared request (credentials redacted) without sending it.
Credentials come from environment variables derived from the file stem: `CLIENT_TOKEN` for bearer auth here, or pass `--token`.
Exit codes are a documented contract (0 ok, 1 API error, 2 auth, 3 validation, 4 usage), and errors print one JSON object to stderr so stdout stays clean for piping.
To ship a real bin, compile with `tsc` and point `package.json`'s `bin` at the compiled file.

The `cli-docs` generator (also selected here) writes `src/api/client.cli.md` alongside it: the Markdown reference for this CLI — usage, global flags, credential variables, exit codes, and every command with its arguments and flags.
It renders from the same command table the CLI dispatches on, so the page cannot drift from the tool; regenerate and the docs follow.
`client.options.cli-docs` sets the page title here, and `redocly eject-generator cli-docs` hands over the renderer itself if you want a different structure — the renderer is the template.
