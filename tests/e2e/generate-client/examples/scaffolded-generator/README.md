# scaffolded-generator

`redocly scaffold-generator ops-summary` created the skeleton for `generators/ops-summary.mjs` (plus `AGENTS.md`, the authoring guide for your coding agent); this example filled the skeleton in to emit a markdown operations summary next to the client.
The generator reads the same API model the built-ins consume, so the summary regenerates with the spec and can never drift from it.

```sh
npm run generate
cat src/api/client.operations.md
```

To customize a built-in language generator instead of writing one from scratch, see the [`ejected-generator`](../ejected-generator) example.
