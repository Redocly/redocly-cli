# cli

The `cli` generator emits `src/api/client.cli.ts` — a bin-ready, zero-dependency command-line interface over the generated client.
Path params are positional, query params become typed `--kebab-name` flags, and JSON bodies arrive via `--json '<json>'`, `--json @file.json`, or `--json @-` (stdin).
With `zod` co-selected (as here), requests are validated before they are sent — an invalid body exits with code 3 and never reaches the network.

Generate the client, then drive the API from the shell:

```sh
npm run generate

npx tsx src/api/client.cli.ts --help
npx tsx src/api/client.cli.ts Products listMenuItems --limit 3
npx tsx src/api/client.cli.ts Orders createOrder --json @order.json --dry-run
npx tsx src/api/client.cli.ts schema createOrder
```

`--dry-run` prints the prepared request (credentials redacted) without sending it.
Credentials come from environment variables derived from the file stem: `CLIENT_TOKEN` for bearer auth here, or pass `--token`.
Exit codes are a documented contract (0 ok, 1 API error, 2 auth, 3 validation, 4 usage), and errors print one JSON object to stderr so stdout stays clean for piping.
To ship a real bin, compile with `tsc` and point `package.json`'s `bin` at the compiled file.
