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

export type RuleConfig =
  | ProblemSeverity
  | 'off'
  | ({
      severity?: ProblemSeverity;
    } & Record<string, any>);

export type PreprocessorConfig =
  | ProblemSeverity
  | 'off'
  | 'on'
  | ({
      severity?: ProblemSeverity;
    } & Record<string, any>);

export type DecoratorConfig = PreprocessorConfig;

export type LintRawConfig = {
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

export type ResolvedLintConfig = PluginLintConfig & {
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
  oasVersion: OasVersion,
) => Record<string, NodeType>;

export type TypeExtensionsConfig = Partial<Record<OasMajorVersion, TypesExtensionFn>>;

export type CustomRulesConfig = {
  oas3?: Oas3RuleSet;
  oas2?: Oas2RuleSet;
};

export type Plugin = {
  id: string;
  configs?: Record<string, PluginLintConfig>;
  rules?: CustomRulesConfig;
  preprocessors?: PreprocessorsConfig;
  decorators?: DecoratorsConfig;
  typeExtension?: TypeExtensionsConfig;
};

export type PluginLintConfig = Omit<LintRawConfig, 'plugins' | 'extends'>;

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

export type DeprecatedRawConfig = {
  apiDefinitions?: Record<string, string>;
  lint?: LintRawConfig;
  resolve?: RawResolveConfig;
  region?: Region;
  referenceDocs?: Record<string, any>;
};

export type Api = {
  root: string;
  lint?: Omit<LintRawConfig, 'plugins'>;
  'features.openapi'?: Record<string, any>;
  'features.mockServer'?: Record<string, any>;
};
export type ResolvedApi = Omit<Api, 'lint'> & { lint: Omit<ResolvedLintConfig, 'plugins'>};

export type RawConfig = {
  apis?: Record<string, Api>;
  lint?: LintRawConfig;
  resolve?: RawResolveConfig;
  region?: Region;
  'features.openapi'?: Record<string, any>;
  'features.mockServer'?: Record<string, any>;
  organization?: string;
};

export type ResolvedConfig = Omit<RawConfig, 'lint' | 'apis'> & {
  lint: ResolvedLintConfig;
  apis: Record<string,ResolvedApi>
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
