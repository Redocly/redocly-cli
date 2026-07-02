---
slug:
  - /docs/cli/configuration/client
---

# `client` configuration

The [`generate-client`](../commands/generate-client.md) command reads its settings from `redocly.yaml`: a top-level `client` block holds shared defaults, and each API under `apis:` supplies its input (`root`), an optional output (`clientOutput`), and any per-API overrides under `apis.<name>.client`.

```yaml
# redocly.yaml
client: # shared defaults for every generated client
  generators:
    - sdk
  facade: functions
apis:
  cafe:
    root: ./openapi.yaml # the input
    clientOutput: ./src/api/client.ts # optional; defaults to `cafe.client.ts`
    client: # per-API overrides (optional)
      facade: service-class
```

```sh
redocly generate-client              # builds every api with a `client` block, to its clientOutput
redocly generate-client cafe         # just the `cafe` api (its client block + clientOutput)
redocly generate-client --config ./config/redocly.yaml
```

## The `client` block

The same fields are accepted at the top level (shared defaults) and under `apis.<name>.client` (per-API overrides): `generators`, `facade`, `name`, `argsStyle`, `serverUrl`, `outputMode`, `enumStyle`, `errorMode`, `dateType`, `queryFramework`, `mockData`, `mockSeed`, and `setup`. Each mirrors the matching CLI flag — see the [command options](../commands/generate-client.md#options) for what every field does.

The input and output are **not** part of a `client` block:

- **input** — `apis.<name>.root` (or a path/alias passed on the command line).
- **output** — `apis.<name>.clientOutput`; when omitted it defaults to `<name>.client.ts` in the `redocly.yaml` directory. `--output` overrides it (single-API invocations only).

## Precedence

Settings resolve **top-level `client` → per-API `client` → CLI flags** (later wins). A plain file-path invocation ignores `apis:` and uses only the top-level `client`.

For code-level control — including registering [custom generators](../commands/generate-client-usage.md#custom-generators) inline — use the programmatic `generateClient(...)` API instead.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [Use the generated client](../commands/generate-client-usage.md) — the runtime API (auth, retries, middleware, extra generators).
- [`apis` configuration](./apis.md) — the `apis:` section and its aliases.
