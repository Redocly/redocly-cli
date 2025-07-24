import { Oas2Types } from './types/oas2.js';
import { Oas3Types } from './types/oas3.js';
import { Oas3_1Types } from './types/oas3_1.js';
import { AsyncApi2Types } from './types/asyncapi2.js';
import { AsyncApi3Types } from './types/asyncapi3.js';
import { Arazzo1Types } from './types/arazzo.js';
import { Overlay1Types } from './types/overlay.js';
import { isPlainObject } from './utils.js';
import { VERSION_PATTERN } from './typings/arazzo.js';

import type {
  BuiltInAsync2RuleId,
  BuiltInAsync3RuleId,
  BuiltInArazzo1RuleId,
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
  BuiltInOverlay1RuleId,
  BuiltInCommonRuleId,
} from './types/redocly-yaml.js';
import type {
  Oas3Rule,
  Oas3Preprocessor,
  Oas2Rule,
  Oas2Preprocessor,
  Async2Preprocessor,
  Async2Rule,
  Async3Preprocessor,
  Async3Rule,
  Arazzo1Preprocessor,
  Arazzo1Rule,
  Overlay1Preprocessor,
  Overlay1Rule,
} from './visitors.js';

export const specVersions = [
  'oas2',
  'oas3_0',
  'oas3_1',
  'async2',
  'async3',
  'arazzo1',
  'overlay1',
] as const;
export type SpecVersion = typeof specVersions[number];

export type SpecMajorVersion = 'oas2' | 'oas3' | 'async2' | 'async3' | 'arazzo1' | 'overlay1';

const typesMap = {
  oas2: Oas2Types,
  oas3_0: Oas3Types,
  oas3_1: Oas3_1Types,
  async2: AsyncApi2Types,
  async3: AsyncApi3Types,
  arazzo1: Arazzo1Types,
  overlay1: Overlay1Types,
};

export type RuleMap<Key extends string, RuleConfig, T> = Record<
  T extends 'built-in' ? Key : string,
  RuleConfig
>;
export type Oas3RuleSet<T = undefined> = RuleMap<
  BuiltInOAS3RuleId | BuiltInCommonRuleId | 'assertions',
  Oas3Rule,
  T
>;
export type Oas2RuleSet<T = undefined> = RuleMap<
  BuiltInOAS2RuleId | BuiltInCommonRuleId | 'assertions',
  Oas2Rule,
  T
>;
export type Async2RuleSet<T = undefined> = RuleMap<
  BuiltInAsync2RuleId | BuiltInCommonRuleId | 'assertions',
  Async2Rule,
  T
>;
export type Async3RuleSet<T = undefined> = RuleMap<
  BuiltInAsync3RuleId | BuiltInCommonRuleId | 'assertions',
  Async3Rule,
  T
>;
export type Arazzo1RuleSet<T = undefined> = RuleMap<
  BuiltInArazzo1RuleId | BuiltInCommonRuleId | 'assertions',
  Arazzo1Rule,
  T
>;

export type Overlay1RuleSet<T = undefined> = RuleMap<
  BuiltInOverlay1RuleId | BuiltInCommonRuleId | 'assertions',
  Overlay1Rule,
  T
>;
export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Async2PreprocessorsSet = Record<string, Async2Preprocessor>;
export type Async3PreprocessorsSet = Record<string, Async3Preprocessor>;
export type Arazzo1PreprocessorsSet = Record<string, Arazzo1Preprocessor>;
export type Overlay1PreprocessorsSet = Record<string, Overlay1Preprocessor>;

export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;
export type Async2DecoratorsSet = Record<string, Async2Preprocessor>;
export type Async3DecoratorsSet = Record<string, Async3Preprocessor>;
export type Arazzo1DecoratorsSet = Record<string, Arazzo1Preprocessor>;
export type Overlay1DecoratorsSet = Record<string, Overlay1Preprocessor>;

export function detectSpec(root: unknown): SpecVersion {
  if (!isPlainObject(root)) {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (root.openapi && typeof root.openapi !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.0')) {
    return 'oas3_0';
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.1')) {
    return 'oas3_1';
  }

  if (root.swagger && root.swagger === '2.0') {
    return 'oas2';
  }

  if (root.openapi || root.swagger) {
    throw new Error(`Unsupported OpenAPI version: ${root.openapi || root.swagger}`);
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('2.')) {
    return 'async2';
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('3.')) {
    return 'async3';
  }

  if (root.asyncapi) {
    throw new Error(`Unsupported AsyncAPI version: ${root.asyncapi}`);
  }

  if (typeof root.arazzo === 'string' && VERSION_PATTERN.test(root.arazzo)) {
    return 'arazzo1';
  }

  if (typeof root.overlay === 'string' && VERSION_PATTERN.test(root.overlay)) {
    return 'overlay1';
  }

  throw new Error(`Unsupported specification`);
}

export function getMajorSpecVersion(version: SpecVersion): SpecMajorVersion {
  if (version === 'oas2') {
    return 'oas2';
  } else if (version === 'async2') {
    return 'async2';
  } else if (version === 'async3') {
    return 'async3';
  } else if (version === 'arazzo1') {
    return 'arazzo1';
  } else if (version === 'overlay1') {
    return 'overlay1';
  } else {
    return 'oas3';
  }
}

export function getTypes(spec: SpecVersion) {
  return typesMap[spec];
}
