// The generate entry (`@redocly/client-generator/generate`): the TypeScript-emitting
// text toolkit for custom generators plus `collectGeneratedFiles` and a `generateClient`
// re-export. It loads `@redocly/openapi-core` (and, only for `--setup` baking,
// `typescript` — lazily), so it must never be reached statically from the package
// root: package-mode clients import the root at app runtime, and the root reaches
// the pipeline only through a dynamic import.

import { builtinGenerators, validateGenerators } from './generators/index.js';
import type {
  EmitOptions,
  GeneratedFile,
  GeneratorDescriptor,
  OutputMode,
} from './generators/types.js';
import type { ApiModel } from './intermediate-representation/model.js';
import { runGenerators } from './pipeline.js';

// --- Codegen toolkit: build TypeScript the same way the built-in generators do -----------------
// Source-text templates, not an AST: the `ts.factory`/printer exports were removed
// when every built-in generator migrated to text (one authoring model for every
// output language). `tsType`/`tsJsdoc`/`codeLiteral` are the TypeScript-specific
// text renderers the sdk itself uses.
export { tsJsdoc, tsType } from './generators/typescript/types.js';
export { codeLiteral } from './printers/typescript.js';
// The language-neutral authoring helpers, re-exported here so both toolkit
// entries offer the full authoring surface (the root offers them TS-free).
export * from './authoring/index.js';
export { operationSignature } from './contracts/typescript.js';
export type { OperationSignature } from './contracts/typescript.js';
export { pascalCase } from './printers/typescript.js';
export { safeIdent } from './printers/typescript.js';

/**
 * Validate the generator selection (see `validateGenerators`), then run each
 * configured generator against the IR and concatenate their files. Throws on a
 * duplicate output path so two generators can't silently clobber each other.
 */
export function collectGeneratedFiles(
  model: ApiModel,
  options: {
    outputPath: string;
    outputMode: OutputMode;
    emit: EmitOptions;
    generators: string[];
    /** The resolved registry (built-ins + custom). Defaults to the built-ins. */
    registry?: Map<string, GeneratorDescriptor>;
  }
): GeneratedFile[] {
  const registry = options.registry ?? builtinGenerators();
  // Fail fast on an incompatible selection (missing prerequisite, unsupported
  // error-mode/date-type/runtime) before producing any file.
  validateGenerators(options.generators, options.emit, registry, options.outputMode);
  return runGenerators(model, { ...options, registry });
}

export { generateClient } from './pipeline.js';
// The composed-cli entry renderer: consumed by the redocly CLI across apis (it needs the
// embedded runtime text, which must stay off the runtime-only root barrel).
export { renderComposedCliEntry, type ComposedCliSource } from './generators/cli/render.js';
