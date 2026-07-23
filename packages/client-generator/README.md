# @redocly/client-generator

Generate a typed TypeScript client from an OpenAPI description.
See https://github.com/Redocly/redocly-cli for the full project.

> [!WARNING]
> This package is experimental: the generated output, options, and the plugin API may change in any minor release until it is declared stable (see [ADR-0013](./docs/adr/0013-experimental-status.md)).
> Pin your version if you depend on the output, and expect to regenerate when you upgrade.
> Feedback is very welcome while we stabilize it.

The generated client uses only web-standard APIs (`fetch`, `AbortController`, `URLSearchParams`), so by default it is a single self-contained file with zero runtime dependencies that runs in browsers, Node ≥ 18, Bun, Deno, and edge runtimes.
(Running the generator itself requires the Node version in this package's `engines` field.)
Code is produced through the TypeScript compiler AST, not string templates; `typescript` is the only peer dependency.

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
  generators: ['sdk', 'zod'],
});

console.log(`Wrote ${result.files.length} file(s), ${result.bytes} bytes.`);
```

Every `redocly.yaml` `client` option is accepted with the same name and default — see the [`client` configuration reference](https://redocly.com/docs/cli/configuration/reference/client).
For type-safe authoring of a standalone options object, annotate it with `satisfies Config`.

### Build extra client instances

The generated module exports its operation descriptors, so an app can build additional instances with independent configuration and credentials over the same generated code:

```ts
import { createClient } from '@redocly/client-generator';
import { OPERATIONS, type Ops } from './client.ts';

const internal = createClient<Ops>(OPERATIONS, {
  serverUrl: 'https://api.example.com',
  auth: { basic: { username: 'svc', password: 's3cr3t' } },
});
```

With `runtime: 'package'` the generated client also imports its whole engine from this package (instead of embedding it), so engine fixes arrive via `npm update` — install this package as a regular dependency of the consuming app.

### Write a custom generator

A custom generator reads the same spec-derived model the built-ins consume, runs in the same pass, and returns files:

```ts
// route-map-generator.ts
import { defineGenerator } from '@redocly/client-generator';

export default defineGenerator({
  name: 'route-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const routes = model.services
      .flatMap((service) => service.operations)
      .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`)
      .join('\n');
    return [
      {
        path: outputPath.replace(/\.ts$/, '.routes.ts'),
        content: `export const routes = {\n${routes}\n} as const;\n`,
      },
    ];
  },
});
```

Select it in `generators` by import specifier (a path or a package name), or register it inline via `customGenerators` and select it by `name`.
A custom generator never adds dependencies to the generated client.

### Bake defaults into a published SDK

The `setup` option takes a module that default-exports `defineClientSetup({ config, middleware })`; its defaults are baked into the generated client so a published SDK ships them built in, and consumers can still override.
See [Publisher defaults](https://redocly.com/docs/cli/guides/use-generated-client#publisher-defaults).

## API

### `generateClient`

Loads the spec, builds the client, and writes the files.

```ts
async function generateClient(options: GenerateClientOptions): Promise<GenerateClientResult>;

type GenerateClientResult = {
  outputPath: string; // the `output` anchor path (the entry file in multi-file modes)
  bytes: number; // total bytes written
  files: Array<{ path: string; bytes: number }>; // every file written to disk
};
```

`GenerateClientOptions` is the [`Config` type](./src/config.ts) (`api` and `output` required; `outputMode`, `runtime`, `argsStyle`, `errorMode`, `dateType`, `serverUrl`, `mockData`, `mockSeed`, `generators`, `customGenerators`, `setup`, `pagination` optional) plus an optional resolved Redocly `config` used for spec loading.

### `collectGeneratedFiles`

Runs the configured generators against a built model and returns the files in memory, without writing to disk.
Imported from `@redocly/client-generator/codegen` — the codegen entry; the package root stays runtime-only so package-mode clients never load the generator stack:

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

Authors a custom generator (`{ name, run }` plus optional `requires`/`errorModes`/`dateTypes`/`runtimes` compatibility metadata, validated up front):

```ts
function defineGenerator(generator: CustomGenerator): CustomGenerator;
```

The `@redocly/client-generator/codegen` entry also exports the codegen toolkit the built-ins use (`ts`, `printStatements`, `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, …), and the package root exports the IR types, so a custom generator emits TypeScript exactly as the first-party ones do.

### `defineClientSetup`

Authors a publisher setup module for the `setup` option:

```ts
function defineClientSetup(setup: {
  config?: ClientConfig;
  middleware?: Middleware[];
}): ClientSetup;
```

A setup module may import only from `@redocly/client-generator`, so it never adds a dependency to the client.

### `createClient`

The runtime factory that `runtime: 'package'` clients import, also usable directly to build extra instances over generated descriptors (see [Basic usage](#build-extra-client-instances)):

```ts
function createClient<Ops>(
  operations: Record<string, OperationDescriptor>,
  config?: ClientConfig
): Client<Ops>;
```

## Examples

Runnable examples — from a zero-install quickstart to middleware, baked setup, SSE streaming, pagination, custom generators, and the package runtime — live in [`tests/e2e/generate-client/examples`](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples).
Each is a standalone Vite app with a checked-in, drift-checked generated client.

## Documentation

- [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) — CLI usage, flags, and `redocly.yaml` configuration.
- [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) — the runtime API and the add-on generators.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) and the [ADRs](./docs/adr/) — how the package is built and why.

## Development

This package is part of the Redocly CLI monorepo. Run all commands from the repo root:

```sh
npm run compile                 # build this package
npm run unit                    # unit tests (this package is held at 100% coverage)
VITEST_SUITE=e2e npx vitest run tests/e2e/generate-client/   # behavioral e2e
```

The client runtime lives in `src/runtime/` (real, unit-testable modules; package mode imports them, inline mode embeds them), the structural emitters in `src/emitters/`, the IR in `src/intermediate-representation/`, the generators in `src/generators/`, and the file-layout writers in `src/writers/`.
