import { logger } from '@redocly/openapi-core';

import { isSafeIdentifier, uniqueIdent } from '../emitters/identifier.js';
import { reservedModuleNames } from '../emitters/reserved-names.js';
import type { ApiModel, OperationModel, SchemaModel } from './model.js';

/**
 * Coerce every document-derived name that lands in a TypeScript *declaration*
 * slot — schema type names, operation (function) names — into a valid, unique JS
 * identifier, and rewrite every reference to a renamed schema to match.
 *
 * This is a security boundary, not a nicety. `ts.factory.createIdentifier` prints
 * its text verbatim with no validation, so a spec name like
 * `foo(){};globalThis.x=1;export async function bar` would emit as executable
 * top-level code in every consumer of the generated client. Sanitizing here, once,
 * means no raw name reaches the printer regardless of which emitter consumes it.
 *
 * Valid identifiers pass through unchanged, so well-formed specs are byte-for-byte
 * unaffected; only `-`/`.`/space/reserved-word/hostile names are rewritten (with a
 * warning). `assertSafeIdentifiers` is the belt-and-suspenders gate that fails the
 * build if any name still slips through — it should never fire after this pass.
 */
export function sanitizeIdentifiers(model: ApiModel): void {
  // Schema types land in the same module scope as everything the generator emits and
  // embeds, so a schema may not reuse a reserved name (the runtime's `ApiError` class,
  // a satellite import like msw's `http`, the `client` const, …). The rename is
  // mode-independent — a `--runtime` flip must not change the generated type names.
  const schemaNames = new Set<string>(reservedModuleNames());
  const renamed = new Map<string, string>();
  for (const schema of model.schemas) {
    const safe = uniqueIdent(schema.name, schemaNames);
    if (safe !== schema.name) {
      renamed.set(schema.name, safe);
      warnRename('schema', schema.name, safe);
      schema.name = safe;
    }
  }

  // Security-scheme keys feed the apiKey setter name (`setApiKey<Key>`, built with a
  // first-char-only pascalCase) and the runtime's security-matching string literals.
  // Sanitize so the setter is a valid identifier, then rewrite each operation's
  // `security` list with the same map so the literals still match.
  const schemeKeys = new Set<string>();
  const renamedKeys = new Map<string, string>();
  for (const scheme of model.securitySchemes) {
    const safe = uniqueIdent(scheme.key, schemeKeys);
    if (safe !== scheme.key) {
      renamedKeys.set(scheme.key, safe);
      warnRename('security scheme', scheme.key, safe);
      scheme.key = safe;
    }
  }

  // A reference to a renamed schema/scheme must follow it; an unknown/dangling name is
  // still sanitized standalone so it can never carry an injection payload.
  const fixRef = (name: string): string => renamed.get(name) ?? sanitizeRef(name);
  const fixKey = (key: string): string => renamedKeys.get(key) ?? sanitizeRef(key);
  for (const schema of model.schemas) rewriteRefs(schema.schema, fixRef);

  // Operations become exported functions in the same module where schema types are
  // used, so the two cannot share a name: the function's own `body: X` annotation
  // would resolve to the function value, and the entry's `export *` would drop the
  // shadowed type. Seeding with the schema names renames a colliding operation.
  const operationNames = new Set<string>(schemaNames);
  for (const service of model.services) {
    for (const op of service.operations) {
      const safe = uniqueIdent(op.name, operationNames);
      if (safe !== op.name) {
        warnRename('operation', op.name, safe);
        op.specName = op.name;
        op.name = safe;
      }
      rewriteOperationRefs(op, fixRef);
      op.security = op.security.map((alternative) => alternative.map(fixKey));
    }
  }
}

/**
 * Throw if any declaration name is still not a safe identifier — a generator bug, not
 * bad input.
 *
 * This gates the three names that land *directly* in a binding slot from the model:
 * schema names, security-scheme keys, and operation names. Identifiers an emitter
 * *derives* from these — path-parameter binding names (`uniqueIdent`) and enum
 * const-object keys (`isIdentifier`-gated) — are sanitized at their point of use,
 * not here, so they stay safe even though this gate does not re-check them.
 */
export function assertSafeIdentifiers(model: ApiModel): void {
  for (const schema of model.schemas) {
    if (!isSafeIdentifier(schema.name)) throw unsafe('schema', schema.name);
  }
  for (const scheme of model.securitySchemes) {
    // The key drives `setApiKey<Key>`, so it must be a safe identifier.
    if (!isSafeIdentifier(scheme.key)) throw unsafe('security scheme', scheme.key);
  }
  for (const service of model.services) {
    for (const op of service.operations) {
      if (!isSafeIdentifier(op.name)) throw unsafe('operation', op.name);
    }
  }
}

function unsafe(kind: string, name: string): Error {
  return new Error(
    `Internal error: ${kind} name ${JSON.stringify(name)} is not a safe identifier after sanitization.`
  );
}

/** Sanitize a ref/`omit` target that has no matching declaration (rare: a dangling $ref). */
function sanitizeRef(name: string): string {
  // No uniqueness context here; a throwaway set yields a pure, deterministic sanitize.
  return uniqueIdent(name, new Set());
}

function warnRename(kind: string, from: string, to: string): void {
  logger.warn(
    `generate-client: ${kind} name ${JSON.stringify(from)} collides with another name or is not a valid TypeScript identifier; using ${JSON.stringify(to)}.\n`
  );
}

/** Rewrite `ref`/`omit`/discriminator targets in a schema subtree via `fixRef` (mutates). */
function rewriteRefs(schema: SchemaModel, fixRef: (name: string) => string): void {
  switch (schema.kind) {
    case 'ref':
      schema.name = fixRef(schema.name);
      break;
    case 'omit':
      schema.base = fixRef(schema.base);
      break;
    case 'array':
      rewriteRefs(schema.items, fixRef);
      break;
    case 'record':
      rewriteRefs(schema.value, fixRef);
      break;
    case 'object':
      for (const prop of schema.properties) rewriteRefs(prop.schema, fixRef);
      break;
    case 'union':
      for (const member of schema.members) rewriteRefs(member, fixRef);
      if (schema.discriminator) {
        for (const entry of schema.discriminator.mapping)
          entry.schemaName = fixRef(entry.schemaName);
      }
      break;
    case 'intersection':
      for (const member of schema.members) rewriteRefs(member, fixRef);
      break;
    // scalar / literal / enum / null / unknown carry no schema references.
  }
}

function rewriteOperationRefs(op: OperationModel, fixRef: (name: string) => string): void {
  for (const p of op.pathParams) rewriteRefs(p.schema, fixRef);
  for (const p of op.queryParams) rewriteRefs(p.schema, fixRef);
  for (const p of op.headerParams) rewriteRefs(p.schema, fixRef);
  for (const p of op.cookieParams) rewriteRefs(p.schema, fixRef);
  if (op.requestBody) rewriteRefs(op.requestBody.schema, fixRef);
  for (const r of [...op.successResponses, ...op.errorResponses]) {
    rewriteRefs(r.schema, fixRef);
    if (r.itemSchema) rewriteRefs(r.itemSchema, fixRef);
  }
}
