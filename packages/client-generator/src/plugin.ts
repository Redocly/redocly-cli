// The custom-generator authoring API — the EXPERIMENTAL plugin surface, re-exported from the
// package root (`@redocly/client-generator`).
//
// ⚠️ Experimental: this surface (the IR types and the codegen toolkit re-exported here) may change
// between minor versions until it is stabilized. Pin your version if you depend on it.
//
// A custom generator is `(GeneratorInput) => GeneratedFile[]` plus a `name`; select it in
// `generators` by name (inline via `customGenerators`) or by import specifier (path/package). It
// receives the same spec-agnostic IR (`model`) the built-in generators consume, and may use the same
// TypeScript-emitting toolkit re-exported below, so a plugin is a first-class peer of `sdk`/`zod`/…
// The generated client stays dependency-free: a plugin's output is its own file(s), and its runtime
// libraries are peers of the consumer's app, never of the client.
//
//   // my-generator.ts
//   import { defineGenerator, ts, printStatements } from '@redocly/client-generator';
//   export default defineGenerator({
//     name: 'route-map',
//     requires: ['sdk'],
//     run({ model, outputPath }) {
//       const routes = model.services.flatMap((s) => s.operations)
//         .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`).join('\n');
//       return [{ path: outputPath.replace(/\.ts$/, '.routes.ts'),
//                 content: `export const routes = {\n${routes}\n} as const;\n` }];
//     },
//   });

import type { CustomGenerator } from './generators/types.js';

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
  CustomGenerator,
  GeneratedFile,
  Generator,
  GeneratorInput,
  GeneratorName,
  OutputMode,
} from './generators/types.js';
export type { ArgsStyle, ErrorMode } from './emitters/operations.js';
export type { DateType } from './emitters/types.js';

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
  ServiceModel,
} from './intermediate-representation/model.js';

// --- Codegen toolkit: build TypeScript the same way the built-in generators do -----------------
export {
  arrow,
  constArray,
  exportConstStatement,
  jsdoc,
  parseStatements,
  printNodes,
  printStatements,
  ts,
} from './emitters/ts.js';
export { operationSignature } from './emitters/operation-signature.js';
export type { OperationSignature } from './emitters/operation-signature.js';
export { schemaToTypeNode } from './emitters/types.js';
export { pascalCase } from './emitters/support.js';
export { safeIdent } from './emitters/identifier.js';
