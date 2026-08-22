// The custom-generator authoring API — the EXPERIMENTAL plugin surface, re-exported from the
// package root (`@redocly/client-generator`).
//
// ⚠️ Experimental: this surface (the IR types and the emit toolkit re-exported here) may change
// between minor versions until it is stabilized. Pin your version if you depend on it.
//
// A custom generator is `(GeneratorInput) => GeneratedFile[]` plus a `name`; select it in
// `generators` by name (inline via `customGenerators`) or by import specifier (path/package). It
// receives the same spec-agnostic IR (`model`) the built-in generators consume, and may use the same
// TypeScript-emitting toolkit re-exported below, so a plugin is a first-class peer of `typescript`/`zod`/…
// The generated client stays dependency-free: a plugin's output is its own file(s), and its runtime
// libraries are peers of the consumer's app, never of the client.
//
//   // my-generator.ts
//   import { defineGenerator } from '@redocly/client-generator';
//   // TypeScript renderers, when a real type is needed rather than guessed text:
//   // import { tsType } from '@redocly/client-generator/generate';
//   export default defineGenerator({
//     name: 'route-map',
//     requires: ['typescript'],
//     run({ model, output }) {
//       const routes = model.services.flatMap((s) => s.operations)
//         .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`).join('\n');
//       return [{ path: output.path.replace(/\.ts$/, '.routes.ts'),
//                 content: `export const routes = {\n${routes}\n} as const;\n` }];
//     },
//   });

import type { CustomGenerator } from './generators/types.js';

export { GENERATOR_VERSION } from './generators/compatibility.js';

/**
 * Identity helper for authoring a custom generator with full type inference and one validation
 * choke-point. `export default defineGenerator({ name, run, … })`. Returns its argument unchanged.
 *
 * @experimental The plugin API may change between minor versions until stabilized.
 */
export function defineGenerator(generator: CustomGenerator): CustomGenerator {
  return generator;
}

// --- The authoring contract + the data a generator receives -----------------------------------
export type {
  ArgsStyle,
  CodeSample,
  CustomGenerator,
  DateType,
  EmitOptions,
  ErrorMode,
  GeneratedFile,
  Generator,
  GeneratorInput,
  GeneratorName,
  GeneratorOptionsSchema,
  OutputAnchor,
  OutputMode,
  SampleContext,
} from './generators/types.js';

// --- The intermediate representation (the `model` a generator walks) ---------------------------
export type {
  ApiModel,
  NamedSchemaModel,
  OperationModel,
  ParamModel,
  PropertyModel,
  RequestBodyModel,
  ResponseBodyModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
  ServerModel,
  ServiceModel,
  SseModel,
} from './intermediate-representation/model.js';

// The TypeScript-emitting renderers (`tsType`, `operationSignature`, …) are exported from
// `@redocly/client-generator/generate`, which also carries the generation entry point —
// the runtime-only package root stays free of it.
