// The language-neutral authoring toolkit barrel. Pure functions over the IR —
// no typescript, no @redocly/openapi-core, no Node builtins — so it is exported
// from the package ROOT: a custom generator importing only these stays TS-free.

// A generator rejects an option it can't honor by throwing this — the CLI prints its
// message as a user error instead of an unexpected crash. Part of the authoring surface
// because an ejected generator only imports from this barrel.
export { NotSupportedError } from '../errors.js';
export { Printer } from './printer.js';
export type { DateType } from './options.js';
export { casing, identifierFor, RESERVED_WORDS, uniqueIdentifiers } from './naming.js';
export { paginationRuleFor, type NeutralPaginationRule } from './pagination.js';
// The Markdown reference page a generator's `docs` hook returns. Here rather than in the
// emitters, so a generator ejected as source reaches it through the package like we do.
export {
  renderReferencePage,
  type ReferenceLanguage,
  type ReferencePageOptions,
} from './reference-page.js';
export {
  isMultipartBody,
  jsonSuccessSchema,
  paginationItemSchema,
  securityRequirements,
  serverUrlParts,
  sseResponse,
  type SecurityRequirement,
  type ServerUrlPart,
} from './operation.js';
export {
  deref,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  headerCoerceType,
  isNullable,
  schemaAtPointer,
  unwrapNullable,
} from './schema.js';

/** Every value exported above — the skill's helper table and Tier-2 telemetry key off this. */
export const AUTHORING_HELPER_NAMES = [
  'Printer',
  'casing',
  'identifierFor',
  'uniqueIdentifiers',
  'RESERVED_WORDS',
  'flattenAllOf',
  'deref',
  'discriminatorCases',
  'jsonSuccessSchema',
  'sseResponse',
  'isMultipartBody',
  'serverUrlParts',
  'securityRequirements',
  'paginationItemSchema',
  'isNullable',
  'unwrapNullable',
  'enumValues',
  'docText',
  'headerCoerceType',
  'schemaAtPointer',
  'paginationRuleFor',
  'renderReferencePage',
  'NotSupportedError',
] as const;
