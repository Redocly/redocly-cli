// The identifiers generated modules already declare, import, or reference — no
// schema or operation may use them as its emitted name. Four layers: the sdk wiring
// the assembly emits, the bindings the satellite generators (zod/mock/tanstack/swr)
// import or declare, the platform globals the emitted code references bare (a
// same-named schema TYPE would shadow them), and every top-level declaration of the
// runtime sources (in embed mode ALL of them — even module-local helpers — share
// the module scope with the generated code). The runtime layer is parsed from
// `RUNTIME_SOURCES`, so it tracks the real runtime with no hand-maintained list to
// drift.

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
  'TimeoutError',
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
// (`handlers`, the transformers' `__Writable` cast helper) alongside type/function
// imports from the sdk entry.
const SATELLITE_NAMES = [
  'z',
  'http',
  'HttpResponse',
  'handlers',
  'faker',
  'queryOptions',
  'useSWR',
  'useSWRMutation',
  '__Writable',
];

// Platform globals and TS utility/lib types the emitted code references by bare name —
// `Date` fields under `--date-type Date`, `Blob` for binary, `Record`/`Omit`/`Partial`
// in emitted types, `Object.assign` in the sugar, and every free identifier of the
// embedded runtime (values AND types: in inline mode a same-named schema — or a string
// enum's const companion — shares the module scope and would shadow them, breaking
// auth, URL building, or JSON parsing at runtime). `reserved-names.test.ts` recomputes
// the runtime's free identifiers with a scope walk and fails when this list falls
// behind. `undefined` is here because `export type undefined` would not even parse.
const GLOBAL_NAMES = [
  'AbortSignal',
  'Array',
  'ArrayBuffer',
  'ArrayBufferView',
  'AsyncGenerator',
  'Blob',
  'BodyInit',
  'Boolean',
  'DOMException',
  'Date',
  'Error',
  'Extract',
  'FormData',
  'Headers',
  'HeadersInit',
  'JSON',
  'Map',
  'Math',
  'NonNullable',
  'Number',
  'Object',
  'Omit',
  'Partial',
  'Promise',
  'ReadableStream',
  'Record',
  'RegExp',
  'RegExpExecArray',
  'Request',
  'RequestInit',
  'Response',
  'Set',
  'String',
  'TextDecoder',
  'TextEncoder',
  'TypeError',
  'URL',
  'URLSearchParams',
  'btoa',
  'clearTimeout',
  'crypto',
  'decodeURIComponent',
  'document',
  'encodeURIComponent',
  'fetch',
  'globalThis',
  'setTimeout',
  'undefined',
];

let cached: Set<string> | undefined;

/** Every name the generated modules reserve: wiring + satellite + globals + runtime declarations. */
export function reservedModuleNames(): Set<string> {
  if (cached === undefined) {
    cached = new Set([...WIRING_NAMES, ...SATELLITE_NAMES, ...GLOBAL_NAMES]);
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
