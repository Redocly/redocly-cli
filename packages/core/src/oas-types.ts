import {
  Oas3Rule,
  Oas3Preprocessor,
  Oas2Rule,
  Oas2Preprocessor,
  Async2Preprocessor,
  Async2Rule,
  ArazzoPreprocessor,
  ArazzoRule,
} from './visitors';
import { Oas2Types } from './types/oas2';
import { Oas3Types } from './types/oas3';
import { Oas3_1Types } from './types/oas3_1';
import { AsyncApi2Types } from './types/asyncapi';
import { ArazzoTypes } from './types/arazzo';
import {
  BuiltInAsync2RuleId,
  BuiltInCommonOASRuleId,
  BuiltInArazzoRuleId,
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
} from './types/redocly-yaml';

export type RuleSet<T> = Record<string, T>;

export enum SpecVersion {
  OAS2 = 'oas2',
  OAS3_0 = 'oas3_0',
  OAS3_1 = 'oas3_1',
  Async2 = 'async2', // todo split into 2.x maybe?
  Arazzo = 'arazzo',
}

export enum SpecMajorVersion {
  OAS2 = 'oas2',
  OAS3 = 'oas3',
  Async2 = 'async2',
  Arazzo = 'arazzo',
}

const typesMap = {
  [SpecVersion.OAS2]: Oas2Types,
  [SpecVersion.OAS3_0]: Oas3Types,
  [SpecVersion.OAS3_1]: Oas3_1Types,
  [SpecVersion.Async2]: AsyncApi2Types,
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
export type ArazzoRuleSet<T = undefined> = RuleMap<
  BuiltInArazzoRuleId | 'assertions',
  ArazzoRule,
  T
>;

export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Async2PreprocessorsSet = Record<string, Async2Preprocessor>;
export type ArazzoPreprocessorsSet = Record<string, ArazzoPreprocessor>;

export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;
export type Async2DecoratorsSet = Record<string, Async2Preprocessor>;
export type ArazzoDecoratorsSet = Record<string, ArazzoPreprocessor>;

export function detectSpec(root: any): SpecVersion {
  if (typeof root !== 'object') {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (root.openapi && typeof root.openapi !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
  }

  if (root.openapi && root.openapi.startsWith('3.0')) {
    return SpecVersion.OAS3_0;
  }

  if (root.openapi && root.openapi.startsWith('3.1')) {
    return SpecVersion.OAS3_1;
  }

  if (root.swagger && root.swagger === '2.0') {
    return SpecVersion.OAS2;
  }

  // if not detected yet
  if (root.openapi || root.swagger) {
    throw new Error(`Unsupported OpenAPI version: ${root.openapi || root.swagger}`);
  }

  if (root.asyncapi && root.asyncapi.startsWith('2.')) {
    return SpecVersion.Async2;
  }

  if (root.asyncapi) {
    throw new Error(`Unsupported AsyncAPI version: ${root.asyncapi}`);
  }

  if (root.arazzo && root.arazzo.startsWith('1.')) {
    return SpecVersion.Arazzo;
  }

  throw new Error(`Unsupported specification`);
}

export function getMajorSpecVersion(version: SpecVersion): SpecMajorVersion {
  if (version === SpecVersion.OAS2) {
    return SpecMajorVersion.OAS2;
  } else if (version === SpecVersion.Async2) {
    return SpecMajorVersion.Async2;
  } else if (version === SpecVersion.Arazzo) {
    return SpecMajorVersion.Arazzo;
  } else {
    return SpecMajorVersion.OAS3;
  }
}

export function getTypes(spec: SpecVersion) {
  return typesMap[spec];
}
