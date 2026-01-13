export { doesYamlFileExist } from './utils/does-yaml-file-exist.js';
export { dequal } from './utils/dequal.js';
export { isEmptyObject } from './utils/is-empty-object.js';
export { isNotEmptyArray } from './utils/is-not-empty-array.js';
export { isNotEmptyObject } from './utils/is-not-empty-object.js';
export { isPlainObject } from './utils/is-plain-object.js';
export { isString } from './utils/is-string.js';
export { isTruthy } from './utils/is-truthy.js';
export { keysOf } from './utils/keys-of.js';
export { pause } from './utils/pause.js';
export { pluralize } from './utils/pluralize.js';
export { readFileFromUrl } from './utils/read-file-from-url.js';
export { slash } from './utils/slash.js';
export { Oas2Types } from './types/oas2.js';
export { Oas3Types } from './types/oas3.js';
export { Oas3_1Types } from './types/oas3_1.js';
export { Oas3_2Types } from './types/oas3_2.js';
export { AsyncApi2Types } from './types/asyncapi2.js';
export { AsyncApi3Types } from './types/asyncapi3.js';
export { Arazzo1Types } from './types/arazzo.js';
export { Overlay1Types } from './types/overlay.js';
export { OpenRpcTypes } from './types/openrpc.js';
export { ConfigTypes, createConfigTypes } from './types/redocly-yaml.js';
export { createEntityTypes, TYPES_OF_ENTITY } from './types/entity-yaml.js';
export { entityNodeTypes } from './types/entity-types.js';
export { normalizeTypes, type NormalizedNodeType, type NodeType } from './types/index.js';
export { Stats } from './rules/other/stats.js';
export {
  loadConfig,
  createConfig,
  findConfig,
  resolvePlugins,
  ConfigValidationError,
  transformScorecardRulesToAssertions,
  Config, // FIXME: export it as a type
  type RawUniversalConfig,
  type RawUniversalApiConfig,
  type ResolvedConfig,
  type ResolvedApiConfig,
  type Plugin,
  type RuleConfig,
  type RuleSeverity,
} from './config/index.js';
export * from './config/constants.js';
export {
  Source,
  BaseResolver,
  Document,
  ResolveError,
  resolveDocument,
  makeDocumentFromString,
  type ResolvedRefMap,
} from './resolve.js';
export { YamlParseError } from './errors/yaml-parse-error.js';
export { parseYaml, stringifyYaml } from './js-yaml/index.js';
export {
  unescapePointerFragment,
  isRef,
  isAbsoluteUrl,
  escapePointerFragment,
  type Location,
} from './ref-utils.js';
export { detectSpec } from './detect-spec.js';
export { getTypes, type SpecVersion, type SpecMajorVersion } from './oas-types.js';
export { getMajorSpecVersion } from './detect-spec.js';
export {
  normalizeVisitors,
  type Oas3Visitor,
  type Oas2Visitor,
  type Async2Visitor,
  type Async3Visitor,
  type Arazzo1Visitor,
  type Overlay1Visitor,
  type OpenRpc1Visitor,
  type Oas3Rule,
  type Oas2Rule,
  type Async2Rule,
  type Async3Rule,
  type Arazzo1Rule,
  type Overlay1Rule,
  type OpenRpc1Rule,
  type Oas3Decorator,
  type Oas2Decorator,
  type Async2Decorator,
  type Async3Decorator,
  type Arazzo1Decorator,
  type Overlay1Decorator,
  type OpenRpc1Decorator,
  type Oas3Preprocessor,
  type Oas2Preprocessor,
  type Async2Preprocessor,
  type Async3Preprocessor,
  type Arazzo1Preprocessor,
  type Overlay1Preprocessor,
  type OpenRpc1Preprocessor,
} from './visitors.js';
export {
  WalkContext,
  NormalizedProblem,
  ProblemSeverity,
  LineColLocationObject,
  LocationObject,
  Loc,
  walkDocument,
  type UserContext,
} from './walk.js';
export { getAstNodeByPointer, getLineColLocation, getCodeframe } from './format/codeframes.js';
export { formatProblems, getTotals, type OutputFormat, type Totals } from './format/format.js';
export {
  lint,
  lint as validate,
  lintDocument,
  lintFromString,
  lintConfig,
  lintEntityFile,
  lintEntityByScorecardLevel,
  lintSchema,
} from './lint.js';
export { bundle, bundleFromString, type BundleResult } from './bundle/bundle.js';
export { bundleDocument } from './bundle/bundle-document.js';
export { mapTypeToComponent } from './bundle/bundle-visitor.js';
export { type Assertions, type Assertion } from './rules/common/assertions/index.js';
export { logger, type LoggerInterface } from './logger.js';
export { HandledError } from './utils/error.js';
export { isBrowser } from './env.js';

export type { CollectFn, Exact } from './utils/types.js';
export type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Components,
  Oas3_1Components,
  Oas3PathItem,
  Oas3Paths,
  Oas3ComponentName,
  Oas3Schema,
  Oas3_1Schema,
  Oas3Tag,
  Oas3_2Tag,
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
export type { OpenRpc1Definition } from './typings/openrpc.js';
export type {
  ArazzoDefinition,
  ExtendedOperation,
  ExtendedSecurity,
  ResolvedSecurity,
} from './typings/arazzo.js';
export type { StatsAccumulator, StatsName } from './typings/common.js';
