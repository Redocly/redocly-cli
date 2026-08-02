// The language-neutral authoring toolkit barrel. Pure functions over the IR —
// no typescript, no @redocly/openapi-core, no Node builtins — so it is exported
// from the package ROOT: a custom generator importing only these stays TS-free.

export { CodeWriter } from './code-writer.js';
export { casing, identifierFor, RESERVED_WORDS } from './naming.js';
export {
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  isNullable,
  unwrapNullable,
} from './schema.js';

/** Every value exported above — the skill's helper table and Tier-2 telemetry key off this. */
export const AUTHORING_HELPER_NAMES = [
  'CodeWriter',
  'casing',
  'identifierFor',
  'RESERVED_WORDS',
  'flattenAllOf',
  'discriminatorCases',
  'isNullable',
  'unwrapNullable',
  'enumValues',
  'docText',
] as const;
