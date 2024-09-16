import type { Location } from '../ref-utils';
import type { ProblemSeverity, UserContext } from '../walk';
import type {
  Oas3PreprocessorsSet,
  SpecMajorVersion,
  Oas3DecoratorsSet,
  Oas2RuleSet,
  Oas2PreprocessorsSet,
  Oas2DecoratorsSet,
  Oas3RuleSet,
  SpecVersion,
  Async2PreprocessorsSet,
  Async2DecoratorsSet,
  Async2RuleSet,
  Async3PreprocessorsSet,
  Async3DecoratorsSet,
  Async3RuleSet,
  ArazzoRuleSet,
  ArazzoPreprocessorsSet,
  ArazzoDecoratorsSet,
  RuleMap,
} from '../oas-types';
import type { NodeType } from '../types';
import type { SkipFunctionContext } from '../visitors';
import type {
  BuiltInAsync2RuleId,
  BuiltInAsync3RuleId,
  BuiltInCommonOASRuleId,
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
  BuiltInArazzoRuleId,
} from '../types/redocly-yaml';
import type { JSONSchema } from 'json-schema-to-ts';

export type RuleSeverity = ProblemSeverity | 'off';

export type RuleSettings = { severity: RuleSeverity };

export type PreprocessorSeverity = RuleSeverity | 'on';

export type RuleConfig =
  | RuleSeverity
  | ({
      severity?: ProblemSeverity;
    } & Record<string, any>);

export type PreprocessorConfig =
  | PreprocessorSeverity
  | ({
      severity?: ProblemSeverity;
    } & Record<string, any>);

export type DecoratorConfig = PreprocessorConfig;

export type StyleguideRawConfig<T = undefined> = {
  plugins?: (string | Plugin)[];
  extends?: string[];
  doNotResolveExamples?: boolean;
  recommendedFallback?: boolean;

  rules?: RuleMap<BuiltInCommonOASRuleId, RuleConfig, T>;
  oas2Rules?: RuleMap<BuiltInOAS2RuleId, RuleConfig, T>;
  oas3_0Rules?: RuleMap<BuiltInOAS3RuleId, RuleConfig, T>;
  oas3_1Rules?: RuleMap<BuiltInOAS3RuleId, RuleConfig, T>;
  async2Rules?: RuleMap<BuiltInAsync2RuleId, RuleConfig, T>;
  async3Rules?: RuleMap<BuiltInAsync3RuleId, RuleConfig, T>;
  arazzoRules?: RuleMap<BuiltInArazzoRuleId, RuleConfig, T>;

  preprocessors?: Record<string, PreprocessorConfig>;
  oas2Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_0Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_1Preprocessors?: Record<string, PreprocessorConfig>;
  async2Preprocessors?: Record<string, PreprocessorConfig>;
  async3Preprocessors?: Record<string, PreprocessorConfig>;
  arazzoPreprocessors?: Record<string, PreprocessorConfig>;

  decorators?: Record<string, DecoratorConfig>;
  oas2Decorators?: Record<string, DecoratorConfig>;
  oas3_0Decorators?: Record<string, DecoratorConfig>;
  oas3_1Decorators?: Record<string, DecoratorConfig>;
  async2Decorators?: Record<string, DecoratorConfig>;
  async3Decorators?: Record<string, DecoratorConfig>;
  arazzoDecorators?: Record<string, DecoratorConfig>;
};

export type ApiStyleguideRawConfig = Omit<StyleguideRawConfig, 'plugins'>;

export type ResolvedStyleguideConfig = PluginStyleguideConfig & {
  plugins?: Plugin[];
  recommendedFallback?: boolean;
  extends?: void | never;
  extendPaths?: string[];
  pluginPaths?: string[];
};

export type PreprocessorsConfig = {
  oas3?: Oas3PreprocessorsSet;
  oas2?: Oas2PreprocessorsSet;
  async2?: Async2PreprocessorsSet;
  async3?: Async3PreprocessorsSet;
  arazzo?: ArazzoPreprocessorsSet;
};

export type DecoratorsConfig = {
  oas3?: Oas3DecoratorsSet;
  oas2?: Oas2DecoratorsSet;
  async2?: Async2DecoratorsSet;
  async3?: Async3DecoratorsSet;
  arazzo?: ArazzoDecoratorsSet;
};

export type TypesExtensionFn = (
  types: Record<string, NodeType>,
  oasVersion: SpecVersion
) => Record<string, NodeType>;

export type TypeExtensionsConfig = Partial<Record<SpecMajorVersion, TypesExtensionFn>>;

export type CustomRulesConfig = {
  oas3?: Oas3RuleSet;
  oas2?: Oas2RuleSet;
  async2?: Async2RuleSet;
  async3?: Async3RuleSet;
  arazzo?: ArazzoRuleSet;
};

export type AssertionContext = Partial<UserContext> & SkipFunctionContext & { node: any };

export type AssertResult = { message?: string; location?: Location };
export type CustomFunction = (
  value: any,
  options: unknown,
  baseLocation: Location
) => AssertResult[];

export type AssertionsConfig = Record<string, CustomFunction>;

export type Plugin = {
  id: string;

  configs?: Record<string, PluginStyleguideConfig>;
  rules?: CustomRulesConfig;
  preprocessors?: PreprocessorsConfig;
  decorators?: DecoratorsConfig;
  typeExtension?: TypeExtensionsConfig;
  assertions?: AssertionsConfig;

  // Realm properties
  path?: string;
  absolutePath?: string;
  processContent?: (actions: any, content: any) => Promise<void> | void;
  afterRoutesCreated?: (actions: any, content: any) => Promise<void> | void;
  loaders?: Record<
    string,
    (path: string, context: any, reportError: (error: Error) => void) => Promise<unknown>
  >;
  requiredEntitlements?: string[];
  ssoConfigSchema?: JSONSchema;
  redoclyConfigSchema?: JSONSchema;
  ejectIgnore?: string[];
};

type PluginCreatorOptions = {
  contentDir: string;
};

export type PluginCreator = (options: PluginCreatorOptions) => Plugin | Promise<Plugin>;

export type ImportedPlugin =
  // ES Modules
  | {
      default?: PluginCreator;
    }
  // CommonJS
  | PluginCreator
  // Deprecated format
  | Plugin;

export type PluginStyleguideConfig<T = undefined> = Omit<
  StyleguideRawConfig<T>,
  'plugins' | 'extends'
>;

export type ResolveHeader =
  | {
      name: string;
      envVariable?: undefined;
      value: string;
      matches: string;
    }
  | {
      name: string;
      value?: undefined;
      envVariable: string;
      matches: string;
    };

export type RawResolveConfig = {
  http?: Partial<HttpResolveConfig>;
  doNotResolveExamples?: boolean;
};

export type HttpResolveConfig = {
  headers: ResolveHeader[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  customFetch?: Function;
};

export type ResolveConfig = {
  http: HttpResolveConfig;
};

export type Region = 'us' | 'eu';
export type Telemetry = 'on' | 'off';

export type AccessTokens = { [region in Region]?: string };

export type DeprecatedInRawConfig = {
  apiDefinitions?: Record<string, string>;
  lint?: StyleguideRawConfig;
  styleguide?: StyleguideRawConfig;
  referenceDocs?: Record<string, any>;
  apis?: Record<string, Api & DeprecatedInApi>;
} & DeprecatedFeaturesConfig;

export type Api = {
  root: string;
  output?: string;
  styleguide?: ApiStyleguideRawConfig;
} & ThemeConfig;

export type DeprecatedInApi = {
  lint?: ApiStyleguideRawConfig;
} & DeprecatedFeaturesConfig;

export type ResolvedApi = Omit<Api, 'styleguide'> & {
  styleguide: ResolvedStyleguideConfig;
  files?: string[];
};

export type RawConfig = {
  apis?: Record<string, Api>;
  styleguide?: StyleguideRawConfig;
  resolve?: RawResolveConfig;
  region?: Region;
  organization?: string;
  files?: string[];
  telemetry?: Telemetry;
} & ThemeConfig;

// RawConfig is legacy, use RawUniversalConfig in public APIs
export type RawUniversalConfig = Omit<RawConfig, 'styleguide'> & StyleguideRawConfig;

export type FlatApi = Omit<Api, 'styleguide'> &
  Omit<ApiStyleguideRawConfig, 'doNotResolveExamples'>;

export type FlatRawConfig = Omit<RawConfig, 'styleguide' | 'resolve' | 'apis'> &
  Omit<StyleguideRawConfig, 'doNotResolveExamples'> & {
    resolve?: RawResolveConfig;
    apis?: Record<string, FlatApi>;
  } & ThemeRawConfig;

export type ResolvedConfig = Omit<RawConfig, 'apis' | 'styleguide'> & {
  apis: Record<string, ResolvedApi>;
  styleguide: ResolvedStyleguideConfig;
};

type DeprecatedFeaturesConfig = {
  'features.openapi'?: Record<string, any>;
  'features.mockServer'?: Record<string, any>;
};

export type ThemeConfig = {
  theme?: ThemeRawConfig;
};

export type ThemeRawConfig = {
  openapi?: Record<string, any>;
  mockServer?: Record<string, any>;
};

// TODO: sync types
export type RulesFields =
  | 'rules'
  | 'oas2Rules'
  | 'oas3_0Rules'
  | 'oas3_1Rules'
  | 'async2Rules'
  | 'async3Rules'
  | 'arazzoRules'
  | 'preprocessors'
  | 'oas2Preprocessors'
  | 'oas3_0Preprocessors'
  | 'oas3_1Preprocessors'
  | 'async2Preprocessors'
  | 'async3Preprocessors'
  | 'arazzoPreprocessors'
  | 'decorators'
  | 'oas2Decorators'
  | 'oas3_0Decorators'
  | 'oas3_1Decorators'
  | 'async2Decorators'
  | 'async3Decorators'
  | 'arazzoDecorators';
