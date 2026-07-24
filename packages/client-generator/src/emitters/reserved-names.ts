// The identifiers generated modules already declare or import — no schema or
// operation may use them as its emitted name. Three layers: the sdk wiring the
// assembly emits, the bindings the satellite generators (zod/mock/tanstack/swr)
// import, and every top-level declaration of the runtime sources (in embed mode
// ALL of them — even module-local helpers — share the module scope with the
// generated code). The runtime layer is parsed from `RUNTIME_SOURCES`, so it
// tracks the real runtime with no hand-maintained list to drift.

import { RUNTIME_SOURCES } from './runtime-sources.js';
import { parseStatements, ts } from './ts.js';

/** Module-scope identifiers every package-mode sdk file emits or imports — never renamed. */
export const WIRING_NAMES = [
  'client',
  'OPERATIONS',
  'Ops',
  'OperationId',
  'OperationPath',
  'OperationTag',
  'createClient',
  'mergeSetup',
  'ApiError',
  'configure',
  'use',
  'auth',
  'ClientConfig',
  'RequestOptions',
  'SseOptions',
  'Middleware',
  'OperationDescriptor',
  'ServerSentEvent',
  'Result',
  'TokenProvider',
  '__redoclySetup',
];

// What the satellite modules import (msw, zod, faker, tanstack, swr) or declare
// (`handlers`) alongside type/function imports from the sdk entry.
const SATELLITE_NAMES = [
  'z',
  'http',
  'HttpResponse',
  'handlers',
  'faker',
  'queryOptions',
  'useSWR',
  'useSWRMutation',
];

let cached: Set<string> | undefined;

/** Every name the generated modules reserve: wiring + satellite + runtime declarations. */
export function reservedModuleNames(): Set<string> {
  if (cached === undefined) {
    cached = new Set([...WIRING_NAMES, ...SATELLITE_NAMES]);
    for (const source of Object.values(RUNTIME_SOURCES)) {
      for (const statement of parseStatements(source)) collectDeclaredName(statement, cached);
    }
  }
  return cached;
}

function collectDeclaredName(statement: ts.Statement, into: Set<string>): void {
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name !== undefined
  ) {
    into.add(statement.name.text);
  } else if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) into.add(declaration.name.text);
    }
  }
}
