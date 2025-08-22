export {
  type CollectFn,
  type Exact,
  keysOf,
  readFileFromUrl,
  slash,
  doesYamlFileExist,
  isTruthy,
  pause,
  isPlainObject,
  isString,
  pluralize,
  isEmptyObject,
  isNotEmptyArray,
  isNotEmptyObject,
} from './utils.js';
export { dequal } from './dequal.js';
export { Oas3_1Types } from './types/oas3_1.js';
export { Arazzo1Types } from './types/arazzo.js';
export { Oas3Types } from './types/oas3.js';
export { Oas2Types } from './types/oas2.js';
export { AsyncApi2Types } from './types/asyncapi2.js';
export { AsyncApi3Types } from './types/asyncapi3.js';
export { ConfigTypes, createConfigTypes } from './types/redocly-yaml.js';

export type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3Components,
  Oas3_1Components,
  Oas3PathItem,
  Oas3Paths,
  Oas3ComponentName,
  Oas3Schema,
  Oas3_1Schema,
  Oas3Tag,
  Referenced,
  OasRef,
  Oas3Parameter,
  Oas3Server,
  Oas3Operation,
  Oas3Responses,
  ApiKeyAuth,
  HttpAuth,
  BasicAuth,
  BearerAuth,
  DigestAuth,
  MutualTLSAuth,
  OAuth2Auth,
  OpenIDAuth,
  Oas3SecurityScheme,
  Oas3SecurityRequirement,
} from './typings/openapi.js';
export type { Oas2Definition } from './typings/swagger.js';
export type { Async3Definition } from './typings/asyncapi3.js';
export type { Async2Definition } from './typings/asyncapi.js';
export type {
  ArazzoDefinition,
  ExtendedOperation,
  ExtendedSecurity,
  ResolvedSecurity,
} from './typings/arazzo.js';
export type { StatsAccumulator, StatsName } from './typings/common.js';
export { type NormalizedNodeType, type NodeType, normalizeTypes } from './types/index.js';
export { Stats } from './rules/other/stats.js';

export {
  type RawUniversalConfig,
  type RawUniversalApiConfig,
  type ResolvedConfig,
  type ResolvedApiConfig,
  type Plugin,
  type RuleConfig,
  Config, // FIXME: export it as a type
  IGNORE_FILE,
  loadConfig,
  findConfig,
  CONFIG_FILE_NAME,
  type RuleSeverity,
  createConfig,
  ConfigValidationError,
  resolvePlugins,
} from './config/index.js';

export {
  type ResolvedRefMap,
  Source,
  BaseResolver,
  Document,
  resolveDocument,
  ResolveError,
  YamlParseError,
  makeDocumentFromString,
} from './resolve.js';
export { parseYaml, stringifyYaml } from './js-yaml/index.js';
export { unescapePointer, isRef, isAbsoluteUrl, escapePointer } from './ref-utils.js';
export {
  type SpecMajorVersion,
  getMajorSpecVersion,
  type SpecVersion,
  detectSpec,
  getTypes,
} from './oas-types.js';
export { normalizeVisitors } from './visitors.js';

export {
  WalkContext,
  walkDocument,
  NormalizedProblem,
  ProblemSeverity,
  LineColLocationObject,
  LocationObject,
  Loc,
} from './walk.js';

export { getAstNodeByPointer, getLineColLocation, getCodeframe } from './format/codeframes.js';
export { formatProblems, OutputFormat, getTotals, Totals } from './format/format.js';
export { lint, lint as validate, lintDocument, lintFromString, lintConfig } from './lint.js';
export {
  type BundleResult,
  bundle,
  bundleDocument,
  mapTypeToComponent,
  bundleFromString,
} from './bundle.js';

export { type Assertions, type Assertion } from './rules/common/assertions/index.js';

export { logger, type LoggerInterface } from './logger.js';
export { HandledError } from './utils/error.js';
export { isBrowser } from './env.js';
