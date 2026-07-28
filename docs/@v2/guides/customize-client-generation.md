# Customize client generation

How to shape what [`generate-client`](../commands/generate-client.md) produces — pre-configured publisher defaults and custom generators.
This page is for the person who **runs the generator** (an SDK publisher, a platform team); for consuming the generated client, see [Use the generated client](./use-generated-client.md).

## Publisher defaults

Middleware and configuration are normally composed by the [consumer](./use-generated-client.md#middleware).
If you **publish an SDK** you can pre-configure the client at generation time with `--setup <file>`: defaults such as the server URL, retries, headers, and middleware are included in the generated client, so the SDK ships with them built in.
Setup changes the client's built-in _behavior_; it emits no extra file — to derive additional artifacts from the description, use [generators](./use-generated-client.md#generators) instead.

A setup module is a plain file that default-exports a `{ config, middleware }` object — no imports required:

```ts
// client-setup.ts
export default {
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
};
```

```sh
redocly generate-client openapi.yaml --output src/api/client.ts --setup ./client-setup.ts
```

Inclusion is a generation-time transform: only the setup expression lands in the client, so an `inline` client stays zero-dependency, and the included block is typed against the client's own contract in the generated file — a shape mistake fails the consumer's `tsc`.

For editor autocomplete while authoring, optionally wrap the object in `defineClientSetup` — a typing-only helper, stripped at generation time, identical in both runtimes:

```ts
// client-setup.ts — the same setup, typed while editing
import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Acme-SDK'] = '1.4.0';
      },
    },
  ],
});
```

The pre-configured block runs before the consumer's own setup.
**Config values** layer lowest to highest — later always wins, so a consumer overrides a pre-configured default:

1. The description's defaults (for example `servers[0].url`).
2. The publisher setup.
3. The app's `configure()`.

**Middleware composes** instead (publisher middleware first, then the consumer's).
Express un-bypassable behavior as middleware, not a custom `fetch`.
A setup file may import **only** from `@redocly/client-generator`.
See the [`baked-setup` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/baked-setup).

## Custom generators

The built-in generators cover common targets.
For anything else derived from the same description (validators in another library, a permissions map, a house-style SDK), write a **custom generator**: it reads the same API model the built-ins consume, so its output never drifts from the description.
A generator adds artifacts _next to_ the client — it doesn't change the generated client's behavior; for that, use [publisher defaults](#publisher-defaults) or let the consumer compose [middleware](./use-generated-client.md#middleware).

A generator is `{ name, run }` (plus optional compatibility metadata); author it with `defineGenerator` from the package root, and build real TypeScript with the emit toolkit from `@redocly/client-generator/generate` — the same `ts.factory` + printer the built-in generators use, so the schema→type mapping matches the sdk's exactly:

```ts
// response-map-generator.ts
import { defineGenerator } from '@redocly/client-generator';
import { printStatements, schemaToTypeNode, ts } from '@redocly/client-generator/generate';

const { factory } = ts;

export default defineGenerator({
  name: 'response-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    // One `ResponseShapes` entry per operation with a JSON success body.
    const members = model.services
      .flatMap((service) => service.operations)
      .flatMap((op) => {
        const success = op.successResponses.find((r) => r.contentType.includes('json'));
        if (!success) return [];
        return [
          factory.createPropertySignature(
            undefined,
            op.name,
            undefined,
            schemaToTypeNode(success.schema)
          ),
        ];
      });
    const alias = factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      'ResponseShapes',
      undefined,
      factory.createTypeLiteralNode(members)
    );
    return [
      { path: outputPath.replace(/\.ts$/, '.responses.ts'), content: printStatements([alias]) },
    ];
  },
});
```

The toolkit exports `ts`, `printStatements`, `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, and more; the package root exports the model (IR) types.
For a trivial artifact, returning a plain string as `content` works too — no toolkit required.

Select a generator in `redocly.yaml` by path or package name:

```yaml
apis:
  cafe:
    root: ./openapi.yaml
    clientOutput: ./src/api/client.ts
    client:
      generators:
        - sdk
        - ./tools/response-map-generator.ts # local path (resolved against redocly.yaml)
        - '@acme/openapi-valibot' # published package
```

Or register one **inline** with the programmatic API and select it by name:

```ts
import { generateClient } from '@redocly/client-generator';
import responseMap from './tools/response-map-generator.ts';

await generateClient({
  api: './openapi.yaml',
  output: './src/api/client.ts',
  customGenerators: [responseMap],
  generators: ['sdk', 'response-map'],
});
```

Import-specifier generators execute at generation time — they carry the same trust level as any installed dependency you run.
See the [`ast-toolkit-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/ast-toolkit-generator) for the runnable toolkit-based plugin (including type-importing referenced schemas), the [`custom-generator` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/custom-generator) for a minimal string-building one, and the [`nested-facade` example](https://github.com/Redocly/redocly-cli/tree/main/tests/e2e/generate-client/examples/nested-facade) for a realistic one that derives an `api.<resource>.<operation>` facade from the description's tags.

## Resources

- [`generate-client` command](../commands/generate-client.md) — flags, output modes, and invocation.
- [`client` configuration](../configuration/reference/client.md) — the `redocly.yaml` `client` block.
- [Use the generated client](./use-generated-client.md) — the consumer-side guide.
