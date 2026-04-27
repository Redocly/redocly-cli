import { Arazzo1Types } from './types/arazzo.js';
import { AsyncApi2Types } from './types/asyncapi2.js';
import { AsyncApi3Types } from './types/asyncapi3.js';
import { Oas2Types } from './types/oas2.js';
import { Oas3Types } from './types/oas3.js';
import { Oas3_1Types } from './types/oas3_1.js';
import { Oas3_2Types } from './types/oas3_2.js';
import { OpenRpcTypes } from './types/openrpc.js';
import { Overlay1Types } from './types/overlay.js';
import type {
  BuiltInAsync2RuleId,
  BuiltInAsync3RuleId,
  BuiltInArazzo1RuleId,
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
  BuiltInOverlay1RuleId,
  BuiltInCommonRuleId,
  BuiltInOpenRpc1RuleId,
  BuiltInOas2DecoratorId,
  BuiltInOas3DecoratorId,
} from './types/redocly-yaml.js';
import type {
  Oas3Rule,
  Oas3Decorator,
  Oas2Rule,
  Oas2Decorator,
  Async2Decorator,
  Async2Rule,
  Async3Decorator,
  Async3Rule,
  Arazzo1Decorator,
  Arazzo1Rule,
  Overlay1Decorator,
  Overlay1Rule,
  OpenRpc1Decorator,
  OpenRpc1Rule,
} from './visitors.js';

export const specVersions = [
  'oas2',
  'oas3_0',
  'oas3_1',
  'oas3_2',
  'async2',
  'async3',
  'arazzo1',
  'overlay1',
  'openrpc1',
] as const;
export type SpecVersion = (typeof specVersions)[number];

export type SpecMajorVersion =
  | 'oas2'
  | 'oas3'
  | 'async2'
  | 'async3'
  | 'arazzo1'
  | 'overlay1'
  | 'openrpc1';

const typesMap = {
  oas2: Oas2Types,
  oas3_0: Oas3Types,
  oas3_1: Oas3_1Types,
  oas3_2: Oas3_2Types,
  async2: AsyncApi2Types,
  async3: AsyncApi3Types,
  arazzo1: Arazzo1Types,
  overlay1: Overlay1Types,
  openrpc1: OpenRpcTypes,
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

export type OpenRpc1RuleSet<T = undefined> = RuleMap<
  BuiltInOpenRpc1RuleId | BuiltInCommonRuleId | 'assertions',
  OpenRpc1Rule,
  T
>;

export type Oas3DecoratorsSet<T = undefined> = Record<
  T extends 'built-in' ? BuiltInOas3DecoratorId : string,
  Oas3Decorator
>;
export type Oas2DecoratorsSet<T = undefined> = Record<
  T extends 'built-in' ? BuiltInOas2DecoratorId : string,
  Oas2Decorator
>;
export type Async2DecoratorsSet = Record<string, Async2Decorator>;
export type Async3DecoratorsSet = Record<string, Async3Decorator>;
export type Arazzo1DecoratorsSet = Record<string, Arazzo1Decorator>;
export type Overlay1DecoratorsSet = Record<string, Overlay1Decorator>;
export type OpenRpc1DecoratorsSet = Record<string, OpenRpc1Decorator>;

export function getTypes(spec: SpecVersion) {
  return typesMap[spec];
}
