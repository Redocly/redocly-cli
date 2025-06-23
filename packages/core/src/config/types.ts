import type { ApiConfig, RedoclyConfig } from '@redocly/config';
import type { Location } from '../ref-utils.js';
import type { ProblemSeverity, UserContext } from '../walk.js';
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
  Arazzo1RuleSet,
  Arazzo1PreprocessorsSet,
  Arazzo1DecoratorsSet,
  RuleMap,
  Overlay1PreprocessorsSet,
  Overlay1DecoratorsSet,
  Overlay1RuleSet,
} from '../oas-types.js';
import type { NodeType } from '../types/index.js';
import type { SkipFunctionContext } from '../visitors.js';
import type { JSONSchema } from 'json-schema-to-ts';

export type RuleSeverity = ProblemSeverity | 'off';

export type RuleSettings = { severity: RuleSeverity; message?: string };

export type PreprocessorSeverity = RuleSeverity | 'on';

export type RuleConfig = RuleSeverity | (Partial<RuleSettings> & Record<string, any>);

export type PreprocessorConfig =
  | PreprocessorSeverity
  | ({
      severity?: ProblemSeverity;
    } & Record<string, any>);

export type DecoratorConfig = PreprocessorConfig;

export type RawGovernanceConfig<T = undefined> = {
  rules?: RuleMap<string, RuleConfig, T>;
  oas2Rules?: RuleMap<string, RuleConfig, T>;
  oas3_0Rules?: RuleMap<string, RuleConfig, T>;
  oas3_1Rules?: RuleMap<string, RuleConfig, T>;
  async2Rules?: RuleMap<string, RuleConfig, T>;
  async3Rules?: RuleMap<string, RuleConfig, T>;
  arazzo1Rules?: RuleMap<string, RuleConfig, T>;
  overlay1Rules?: RuleMap<string, RuleConfig, T>;

  preprocessors?: Record<string, PreprocessorConfig>;
  oas2Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_0Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_1Preprocessors?: Record<string, PreprocessorConfig>;
  async2Preprocessors?: Record<string, PreprocessorConfig>;
  async3Preprocessors?: Record<string, PreprocessorConfig>;
  arazzo1Preprocessors?: Record<string, PreprocessorConfig>;
  overlay1Preprocessors?: Record<string, PreprocessorConfig>;

  decorators?: Record<string, DecoratorConfig>;
  oas2Decorators?: Record<string, DecoratorConfig>;
  oas3_0Decorators?: Record<string, DecoratorConfig>;
  oas3_1Decorators?: Record<string, DecoratorConfig>;
  async2Decorators?: Record<string, DecoratorConfig>;
  async3Decorators?: Record<string, DecoratorConfig>;
  arazzo1Decorators?: Record<string, DecoratorConfig>;
  overlay1Decorators?: Record<string, DecoratorConfig>;
};

export type ResolvedGovernanceConfig = RawGovernanceConfig & {
  plugins?: Plugin[];
  extendPaths?: string[];
  pluginPaths?: string[];
};

export type PreprocessorsConfig = {
  oas3?: Oas3PreprocessorsSet;
  oas2?: Oas2PreprocessorsSet;
  async2?: Async2PreprocessorsSet;
  async3?: Async3PreprocessorsSet;
  arazzo1?: Arazzo1PreprocessorsSet;
  overlay1?: Overlay1PreprocessorsSet;
};

export type DecoratorsConfig = {
  oas3?: Oas3DecoratorsSet;
  oas2?: Oas2DecoratorsSet;
  async2?: Async2DecoratorsSet;
  async3?: Async3DecoratorsSet;
  arazzo1?: Arazzo1DecoratorsSet;
  overlay1?: Overlay1DecoratorsSet;
};

export type TypesExtensionFn = (
  types: Record<string, NodeType>,
  oasVersion: SpecVersion
) => Record<string, NodeType>;

export type TypeExtensionsConfig = Partial<Record<SpecMajorVersion, TypesExtensionFn>>;

export type RulesConfig<T> = {
  oas3?: Oas3RuleSet<T>;
  oas2?: Oas2RuleSet<T>;
  async2?: Async2RuleSet<T>;
  async3?: Async3RuleSet<T>;
  arazzo1?: Arazzo1RuleSet<T>;
  overlay1?: Overlay1RuleSet<T>;
};

export type CustomRulesConfig = RulesConfig<undefined>;

export type AssertionContext = Partial<UserContext> & SkipFunctionContext & { node: any };

export type AssertResult = { message?: string; location?: Location };
export type CustomFunction = (
  value: any,
  options: unknown,
  baseLocation: Location
) => AssertResult[];

export type AssertionsConfig = Record<string, CustomFunction>;

export type Plugin<T = undefined> = {
  id: string;

  configs?: Record<string, RawGovernanceConfig>;
  rules?: RulesConfig<T>;
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

export type Telemetry = 'on' | 'off';

export type RawUniversalApiConfig = ApiConfig &
  RawGovernanceConfig & {
    plugins?: (string | Plugin)[];
  };

export type ResolvedApiConfig = ApiConfig &
  Required<RawGovernanceConfig> &
  ResolvedGovernanceConfig;

export type RawUniversalConfig = Omit<Partial<RedoclyConfig>, 'apis' | 'plugins'> &
  RawGovernanceConfig & {
    plugins?: (string | Plugin)[];
    apis?: Record<string, RawUniversalApiConfig>;

    resolve?: RawResolveConfig;
    telemetry?: Telemetry;
  };

export type ResolvedConfig = Omit<RawUniversalConfig, 'apis' | 'plugins'> &
  ResolvedGovernanceConfig & {
    apis?: Record<string, ResolvedApiConfig>;
    residency?: string;
};

export type ThemeConfig = {
  theme?: ThemeRawConfig; // TODO: deprecated
};

export type ThemeRawConfig = {
  openapi?: Record<string, any>;
  mockServer?: Record<string, any>;
};
