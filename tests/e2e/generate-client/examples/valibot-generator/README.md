# valibot-generator

A custom generator that emits [Valibot](https://valibot.dev) schemas beside the client, in about 60 lines.

The built-in validation generator emits [Zod](https://zod.dev) schemas.
This example exists to show what to do when the built-ins do not cover the library you use: you write the generator, and it runs in the same pass as the built-in ones.

```bash
npm run generate   # redocly generate-client
```

That writes two files from one description:

- `src/api/client.ts` — the typed client, from the built-in `typescript` generator.
- `src/api/client.valibot.ts` — one `<Name>Schema` per named schema, plus the inferred type, from [`valibot-schema-generator.mjs`](./valibot-schema-generator.mjs).

`src/main.ts` uses both: the client types the call, and `v.parse` checks the value at run time.

## What the generator shows

- **The API model is the input.** `model.schemas` is the list of named schemas, each already resolved.
- **Composition is solved for you.** `flattenAllOf` merges an `allOf` chain into one property list, so the generator never implements composition semantics.
- **Enums come with their values.** `enumValues` returns them, and `v.picklist` takes them directly.
- **`Printer` builds the text.** No template language, and no whitespace bookkeeping.
- **Metadata carries `format`.** A `format: binary` property is a `Blob` in the client, so the schema uses `v.blob()`.
  A generator that ignored `format` would emit a schema that disagrees with the client's own type, and this example's `tsc` bar would fail.

Nothing here is privileged: the built-in `zod` generator has the same shape, and this file could be published as a package or committed in your repo.

## Configuration

The generator is selected by path, next to a built-in name:

```yaml
apis:
  valibot-generator:
    root: ../_shared/cafe.yaml
    clientOutput: ./src/api/client.ts
    client:
      generators:
        - typescript
        - ./valibot-schema-generator.mjs
```

See [Customize client generation](https://redocly.com/docs/cli/guides/customize-client-generation) for the full contract: declared options, the helper table, compatibility ranges, and ejecting a built-in generator to start from its code instead of a blank file.
