# scaffolded-generator

`redocly scaffold-generator ops-summary` created the skeleton for `generators/ops-summary.mjs` plus `generators/AGENTS.md` (committed here) — the authoring guide your coding agent uses as context to fill the skeleton in; this example evolved it into a markdown operations summary emitted next to the client.
The generator reads the same API model the built-ins consume, so the summary regenerates with the spec and can never drift from it.

```sh
npm run generate
cat src/api/client.operations.md
npm run scaffold    # try the command yourself: scaffolds a fresh generators/my-generator.mjs
```

To customize a built-in language generator instead of writing one from scratch, see the [`ejected-generator`](../ejected-generator) example.
