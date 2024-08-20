import { Oas2Types } from './types/oas2';
import { Oas3Types } from './types/oas3';
import { Oas3_1Types } from './types/oas3_1';
import { AsyncApi2Types } from './types/asyncapi2';
import { AsyncApi3Types } from './types/asyncapi3';
import { ArazzoTypes } from './types/arazzo';
import { isPlainObject } from './utils';
import { VERSION_PATTERN } from './typings/arazzo';

import type {
  BuiltInAsync2RuleId,
  BuiltInAsync3RuleId,
  BuiltInCommonOASRuleId,
  BuiltInArazzoRuleId,
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
} from './types/redocly-yaml';
import type {
  Oas3Rule,
  Oas3Preprocessor,
  Oas2Rule,
  Oas2Preprocessor,
  Async2Preprocessor,
  Async2Rule,
  Async3Preprocessor,
  Async3Rule,
  ArazzoPreprocessor,
  ArazzoRule,
} from './visitors';

export enum SpecVersion {
  OAS2 = 'oas2',
  OAS3_0 = 'oas3_0',
  OAS3_1 = 'oas3_1',
  Async2 = 'async2',
  Async3 = 'async3',
  Arazzo = 'arazzo',
}

export enum SpecMajorVersion {
  OAS2 = 'oas2',
  OAS3 = 'oas3',
  Async2 = 'async2',
  Async3 = 'async3',
  Arazzo = 'arazzo',
}

const typesMap = {
  [SpecVersion.OAS2]: Oas2Types,
  [SpecVersion.OAS3_0]: Oas3Types,
  [SpecVersion.OAS3_1]: Oas3_1Types,
  [SpecVersion.Async2]: AsyncApi2Types,
  [SpecVersion.Async3]: AsyncApi3Types,
  [SpecVersion.Arazzo]: ArazzoTypes,
};

export type RuleMap<Key extends string, RuleConfig, T> = Record<
  T extends 'built-in' ? Key : string,
  RuleConfig
>;
export type Oas3RuleSet<T = undefined> = RuleMap<
  BuiltInCommonOASRuleId | BuiltInOAS3RuleId | 'assertions',
  Oas3Rule,
  T
>;
export type Oas2RuleSet<T = undefined> = RuleMap<
  BuiltInCommonOASRuleId | BuiltInOAS2RuleId | 'assertions',
  Oas2Rule,
  T
>;
export type Async2RuleSet<T = undefined> = RuleMap<
  BuiltInAsync2RuleId | 'assertions',
  Async2Rule,
  T
>;
export type Async3RuleSet<T = undefined> = RuleMap<
  BuiltInAsync3RuleId | 'assertions',
  Async3Rule,
  T
>;
export type ArazzoRuleSet<T = undefined> = RuleMap<
  BuiltInArazzoRuleId | 'assertions',
  ArazzoRule,
  T
>;

export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Async2PreprocessorsSet = Record<string, Async2Preprocessor>;
export type Async3PreprocessorsSet = Record<string, Async3Preprocessor>;
export type ArazzoPreprocessorsSet = Record<string, ArazzoPreprocessor>;

export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;
export type Async2DecoratorsSet = Record<string, Async2Preprocessor>;
export type Async3DecoratorsSet = Record<string, Async3Preprocessor>;
export type ArazzoDecoratorsSet = Record<string, ArazzoPreprocessor>;

export function detectSpec(root: unknown): SpecVersion {
  if (!isPlainObject(root)) {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (root.openapi && typeof root.openapi !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.0')) {
    return SpecVersion.OAS3_0;
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.1')) {
    return SpecVersion.OAS3_1;
  }

  if (root.swagger && root.swagger === '2.0') {
    return SpecVersion.OAS2;
  }

  if (root.openapi || root.swagger) {
    throw new Error(`Unsupported OpenAPI version: ${root.openapi || root.swagger}`);
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('2.')) {
    return SpecVersion.Async2;
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('3.')) {
    return SpecVersion.Async3;
  }

  if (root.asyncapi) {
    throw new Error(`Unsupported AsyncAPI version: ${root.asyncapi}`);
  }

  if (typeof root.arazzo === 'string' && VERSION_PATTERN.test(root.arazzo)) {
    return SpecVersion.Arazzo;
  }

  throw new Error(`Unsupported specification`);
}

export function getMajorSpecVersion(version: SpecVersion): SpecMajorVersion {
  if (version === SpecVersion.OAS2) {
    return SpecMajorVersion.OAS2;
  } else if (version === SpecVersion.Async2) {
    return SpecMajorVersion.Async2;
  } else if (version === SpecVersion.Async3) {
    return SpecMajorVersion.Async3;
  } else if (version === SpecVersion.Arazzo) {
    return SpecMajorVersion.Arazzo;
  } else {
    return SpecMajorVersion.OAS3;
  }
}

export function getTypes(spec: SpecVersion) {
  return typesMap[spec];
}
