import type { ProblemSeverity } from '../walk';
import type {
  Oas3PreprocessorsSet,
  OasMajorVersion,
  Oas3DecoratorsSet,
  Oas2RuleSet,
  Oas2PreprocessorsSet,
  Oas2DecoratorsSet,
  Oas3RuleSet,
  OasVersion,
} from '../oas-types';
import type { NodeType } from '../types';
import { Location } from '../ref-utils';

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

export type StyleguideRawConfig = {
  plugins?: (string | Plugin)[];
  extends?: string[];
  doNotResolveExamples?: boolean;
  recommendedFallback?: boolean;

  rules?: Record<string, RuleConfig>;
  oas2Rules?: Record<string, RuleConfig>;
  oas3_0Rules?: Record<string, RuleConfig>;
  oas3_1Rules?: Record<string, RuleConfig>;

  preprocessors?: Record<string, PreprocessorConfig>;
  oas2Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_0Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_1Preprocessors?: Record<string, PreprocessorConfig>;

  decorators?: Record<string, DecoratorConfig>;
  oas2Decorators?: Record<string, DecoratorConfig>;
  oas3_0Decorators?: Record<string, DecoratorConfig>;
  oas3_1Decorators?: Record<string, DecoratorConfig>;
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
};

export type DecoratorsConfig = {
  oas3?: Oas3DecoratorsSet;
  oas2?: Oas2DecoratorsSet;
};

export type TypesExtensionFn = (
  types: Record<string, NodeType>,
  oasVersion: OasVersion
) => Record<string, NodeType>;

export type TypeExtensionsConfig = Partial<Record<OasMajorVersion, TypesExtensionFn>>;

export type CustomRulesConfig = {
  oas3?: Oas3RuleSet;
  oas2?: Oas2RuleSet;
};

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
};

export type PluginStyleguideConfig = Omit<StyleguideRawConfig, 'plugins' | 'extends'>;

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
  customFetch?: Function;
};

export type ResolveConfig = {
  http: HttpResolveConfig;
};

export type Region = 'us' | 'eu';

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
} & ThemeConfig;

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

export type RulesFields =
  | 'rules'
  | 'oas2Rules'
  | 'oas3_0Rules'
  | 'oas3_1Rules'
  | 'preprocessors'
  | 'oas2Preprocessors'
  | 'oas3_0Preprocessors'
  | 'oas3_1Preprocessors'
  | 'decorators'
  | 'oas2Decorators'
  | 'oas3_0Decorators'
  | 'oas3_1Decorators';
