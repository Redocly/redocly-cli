# @redocly/client-generator

Generate a typed TypeScript client from an OpenAPI description.
See https://github.com/Redocly/redocly-cli for the full project.

> [!WARNING]
> This package is experimental: the generated output, options, and the plugin API may change in any minor release until it is declared stable.
> Pin your version if you depend on the output, and expect to regenerate when you upgrade.
> Feedback is very welcome while we stabilize it.

The generated client uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`), so by default it is a single self-contained file with zero runtime dependencies that runs in browsers, Node ≥ 18, Bun, Deno, and edge runtimes.
(Running the generator itself requires the Node version in this package's `engines` field.)
Code is produced through the TypeScript compiler AST, not string templates; `typescript` is the only peer dependency — optional, needed only when you run generation, and it must be 6.x there (TypeScript 7's native compiler has no compiler API).
Apps that only consume a generated client don't need it at all, and can compile the generated code with any TypeScript, including 7.

This package is the engine behind the [`generate-client` command](https://redocly.com/docs/cli/commands/generate-client) — install [`@redocly/cli`](https://www.npmjs.com/package/@redocly/cli) to run it from the command line or `redocly.yaml`.
How to use the generated client — auth, middleware, retries, pagination, Server-Sent Events, and the add-on generators (`zod`, `tanstack-query`, `swr`, `mock`, `transformers`) — is documented in [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client).
This README covers using the package programmatically.

## Basic usage

### Generate a client

```ts
import { generateClient } from '@redocly/client-generator';

const result = await generateClient({
  api: './openapi.yaml', // file path or URL; OpenAPI 3.0/3.1/3.2 or Swagger 2.0
  output: './src/api/client.ts',
  generators: ['typescript', 'zod'],
});

console.log(`Wrote ${result.files.length} file(s), ${result.bytes} bytes.`);
```

Every `redocly.yaml` `client` option is accepted with the same name and default — see the [`client` configuration reference](https://redocly.com/docs/cli/configuration/reference/client).
For type-safe authoring of a standalone options object, annotate it with `satisfies GenerateClientOptions`.

### Build extra client instances

The generated module exports its operation descriptors, so an app can build additional instances with independent configuration and credentials over the same generated code:

```ts
import { createClient, OPERATIONS, type Ops } from './client.ts';

const internal = createClient<Ops>(OPERATIONS, {
  serverUrl: 'https://api.example.com',
  auth: { basic: { username: 'svc', password: 's3cr3t' } },
});
```

### Write a custom generator

A custom generator reads the same API model the built-ins consume, runs in the same pass, and returns files.
Emitters print text: `Printer` handles indentation, and `tsType` is the same schema→type renderer the built-in sdk uses, so the mapping (refs, arrays, unions, formats, parenthesization) matches the generated client exactly:

```ts
// response-map-generator.ts
import { defineGenerator, Printer } from '@redocly/client-generator';
import { tsType } from '@redocly/client-generator/generate';

export default defineGenerator({
  name: 'response-map',
  requires: ['typescript'],
  run({ model, output }) {
    const printer = new Printer();
    // One `ResponseShapes` entry per operation with a JSON success body.
    printer.block(
      'export type ResponseShapes = {',
      () => {
        for (const service of model.services) {
          for (const op of service.operations) {
            const success = op.successResponses.find((r) => r.contentType.includes('json'));
            if (success) printer.line(`${op.name}: ${tsType(success.schema)};`);
          }
        }
      },
      '};'
    );
    return [{ path: output.path.replace(/\.ts$/, '.responses.ts'), content: printer.toString() }];
  },
});
```

For a trivial artifact, returning a plain string as `content` works too — no toolkit required.
Select the generator in `generators` by import specifier (a path or a package name), or register it inline via `customGenerators` and select it by `name`.
A custom generator never adds dependencies to the generated client.
See [Custom generators](https://redocly.com/docs/cli/guides/customize-client-generation#custom-generators).

### Pre-configure a published SDK

The `setup` option takes a module that default-exports a `{ config, middleware }` object (optionally wrapped in `defineClientSetup` for editor typing); its defaults are included in the generated client so a published SDK ships them built in, and consumers can still override.
See [Publisher defaults](https://redocly.com/docs/cli/guides/customize-client-generation#publisher-defaults).

## API

### `generateClient`

Loads the description, builds the client, and writes the files.

```ts
async function generateClient(options: GenerateClientOptions): Promise<GenerateClientResult>;

type GenerateClientResult = {
  outputPath: string; // the `output` anchor path (the entry file in multi-file modes)
  bytes: number; // total bytes written
  files: Array<{ path: string; bytes: number }>; // every file written to disk
};
```

`GenerateClientOptions` is the options type ([`src/types.ts`](https://github.com/Redocly/redocly-cli/blob/main/packages/client-generator/src/types.ts)) (`api` and `output` required; `outputMode`, `runtime`, `importExt`, `argsStyle`, `errorMode`, `dateType`, `serverUrl`, `mockData`, `mockSeed`, `generators`, `customGenerators`, `setup`, `pagination` optional) plus an optional resolved Redocly `config` used to load the description.

### `collectGeneratedFiles`

Runs the configured generators against a built model and returns the files in memory, without writing to disk.
Imported from `@redocly/client-generator/generate` — the generation-time entry; the package root stays a small authoring surface:

```ts
function collectGeneratedFiles(
  model: ApiModel,
  options: {
    outputPath: string;
    outputMode: OutputMode;
    emit: EmitOptions;
    generators: string[];
    registry?: Map<string, GeneratorDescriptor>; // defaults to the built-ins
  }
): GeneratedFile[];
```

### `defineGenerator`

Authors a custom generator (`{ name, run }` plus optional `requires`/`errorModes`/`dateTypes` compatibility metadata, validated up front):

```ts
function defineGenerator(generator: CustomGenerator): CustomGenerator;
```

The `@redocly/client-generator/generate` entry also exports the TypeScript renderers the built-ins use (`tsType`, `tsJsdoc`, `codeLiteral`, `operationSignature`, `pascalCase`, `safeIdent`).
The package root exports the IR types plus the language-neutral toolkit.
A custom generator emits TypeScript exactly as the first-party ones do.
See the [`typescript-types-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/typescript-types-generator).

### `defineClientSetup`

Optional typing helper for authoring a publisher setup module — a plain default-exported `{ config, middleware }` object works too, with no imports:

```ts
function defineClientSetup(setup: {
  config?: ClientConfig;
  middleware?: Middleware[];
}): ClientSetup;
```

A setup module may import only from `@redocly/client-generator`, so it never adds a dependency to the client (the import is stripped at generation time).

## Examples

Runnable examples — from a zero-install quickstart to middleware, publisher setup, SSE streaming, pagination, and custom generators — live in [`tests/e2e/generate-client/examples`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples).
Each is a standalone Vite app with a checked-in, drift-checked generated client.

## Documentation

- [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) — CLI usage, flags, and `redocly.yaml` configuration.
- [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) — the runtime API and the add-on generators.
- [Customize client generation](https://redocly.com/docs/cli/guides/customize-client-generation) — publisher defaults and custom generators.
- [`ARCHITECTURE.md`](https://github.com/Redocly/redocly-cli/blob/main/packages/client-generator/ARCHITECTURE.md) and the [ADRs](https://github.com/Redocly/redocly-cli/tree/main/packages/client-generator/docs/adr) — how the package is built and why.

## Development

This package is part of the Redocly CLI monorepo.
Run all commands from the repo root:

```sh
npm run compile                 # build this package
npm run unit                    # unit tests (this package is held at 100% coverage)
VITEST_SUITE=e2e npx vitest run tests/e2e/generate-client/   # behavioral e2e
```

The client runtime lives in `src/runtime/` (real, unit-testable modules that generation embeds), the structural emitters in `src/emitters/`, the IR in `src/intermediate-representation/`, and the generators in `src/generators/`.
