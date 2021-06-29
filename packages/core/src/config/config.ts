import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { dirname } from 'path';
import { red, blue } from 'colorette';

import { notUndefined } from '../utils';

import {
  OasVersion,
  Oas3PreprocessorsSet,
  OasMajorVersion,
  Oas3DecoratorsSet,
  Oas2RuleSet,
  Oas2PreprocessorsSet,
  Oas2DecoratorsSet,
  Oas3RuleSet
} from '../oas-types';

import { ProblemSeverity, NormalizedProblem } from '../walk';

import recommended from './recommended';
import { NodeType } from '../types';

export const IGNORE_FILE = '.redocly.lint-ignore.yaml';
const IGNORE_BANNER =
  `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.\n` +
  `# See https://redoc.ly/docs/cli/ for more information.\n`;

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
  | {
      severity?: ProblemSeverity;
      options?: Record<string, any>;
    };

export type DecoratorConfig = PreprocessorConfig;

export type LintRawConfig = {
  plugins?: (string | Plugin)[];
  extends?: string[];
  doNotResolveExamples?: boolean;

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
  configs?: Record<string, LintRawConfig>;
  rules?: CustomRulesConfig;
  preprocessors?: PreprocessorsConfig;
  decorators?: DecoratorsConfig;
  typeExtension?: TypeExtensionsConfig;
};

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

export type RawConfig = {
  referenceDocs?: any;
  apiDefinitions?: Record<string, string>;
  lint?: LintRawConfig;
  resolve?: RawResolveConfig;
};

export class LintConfig {
  plugins: Plugin[];
  ignore: Record<string, Record<string, Set<string>>> = {};
  doNotResolveExamples: boolean;
  rules: Record<OasVersion, Record<string, RuleConfig>>;
  preprocessors: Record<OasVersion, Record<string, PreprocessorConfig>>;
  decorators: Record<OasVersion, Record<string, DecoratorConfig>>;

  private _usedRules: Set<string> = new Set();
  private _usedVersions: Set<OasVersion> = new Set();

  recommendedFallback: boolean = false;

  constructor(public rawConfig: LintRawConfig, public configFile?: string) {
    this.plugins = rawConfig.plugins ? resolvePlugins(rawConfig.plugins, configFile) : [];
    this.doNotResolveExamples = !!rawConfig.doNotResolveExamples;

    if (!rawConfig.extends) {
      this.recommendedFallback = true;
    }

    const extendConfigs: LintRawConfig[] = rawConfig.extends
      ? resolvePresets(rawConfig.extends, this.plugins)
      : [recommended];

    if (rawConfig.rules || rawConfig.preprocessors || rawConfig.decorators) {
      extendConfigs.push({
        rules: rawConfig.rules,
        preprocessors: rawConfig.preprocessors,
        decorators: rawConfig.decorators,
      });
    }

    const merged = mergeExtends(extendConfigs);

    this.rules = {
      [OasVersion.Version2]: { ...merged.rules, ...merged.oas2Rules },
      [OasVersion.Version3_0]: { ...merged.rules, ...merged.oas3_0Rules },
      [OasVersion.Version3_1]: { ...merged.rules, ...merged.oas3_1Rules },
    };

    this.preprocessors = {
      [OasVersion.Version2]: { ...merged.preprocessors, ...merged.oas2Preprocessors },
      [OasVersion.Version3_0]: { ...merged.preprocessors, ...merged.oas3_0Preprocessors },
      [OasVersion.Version3_1]: { ...merged.preprocessors, ...merged.oas3_1Preprocessors },
    };

    this.decorators = {
      [OasVersion.Version2]: { ...merged.decorators, ...merged.oas2Decorators },
      [OasVersion.Version3_0]: { ...merged.decorators, ...merged.oas3_0Decorators },
      [OasVersion.Version3_1]: { ...merged.decorators, ...merged.oas3_1Decorators },
    };

    const dir = this.configFile ? path.dirname(this.configFile) : (typeof process !== 'undefined' && process.cwd() || '');
    const ignoreFile = path.join(dir, IGNORE_FILE);

    /* no crash when using it on the client */
    if (fs.hasOwnProperty('existsSync') && fs.existsSync(ignoreFile)) {
      // TODO: parse errors
      this.ignore =
        (yaml.safeLoad(fs.readFileSync(ignoreFile, 'utf-8')) as Record<
          string,
          Record<string, Set<string>>
        >) || {};

      // resolve ignore paths
      for (const fileName of Object.keys(this.ignore)) {
        this.ignore[path.resolve(dirname(ignoreFile), fileName)] = this.ignore[fileName];
        for (const ruleId of Object.keys(this.ignore[fileName])) {
          this.ignore[fileName][ruleId] = new Set(this.ignore[fileName][ruleId]);
        }
        delete this.ignore[fileName];
      }
    }
  }

  saveIgnore() {
    const dir = this.configFile ? path.dirname(this.configFile) : process.cwd();
    const ignoreFile = path.join(dir, IGNORE_FILE);
    const mapped: Record<string, any> = {};
    for (const absFileName of Object.keys(this.ignore)) {
      const ignoredRules = (mapped[path.relative(dir, absFileName)] = this.ignore[absFileName]);
      for (const ruleId of Object.keys(ignoredRules)) {
        ignoredRules[ruleId] = Array.from(ignoredRules[ruleId]) as any;
      }
    }
    fs.writeFileSync(ignoreFile, IGNORE_BANNER + yaml.safeDump(mapped));
  }

  addIgnore(problem: NormalizedProblem) {
    const ignore = this.ignore;
    const loc = problem.location[0];
    if (loc.pointer === undefined) return;

    const fileIgnore = (ignore[loc.source.absoluteRef] = ignore[loc.source.absoluteRef] || {});
    const ruleIgnore = (fileIgnore[problem.ruleId] = fileIgnore[problem.ruleId] || new Set());

    ruleIgnore.add(loc.pointer);
  }

  addProblemToIgnore(problem: NormalizedProblem) {
    const loc = problem.location[0];
    if (loc.pointer === undefined) return problem;

    const fileIgnore = this.ignore[loc.source.absoluteRef] || {};
    const ruleIgnore = fileIgnore[problem.ruleId];
    const ignored = ruleIgnore && ruleIgnore.has(loc.pointer);
    return ignored
      ? {
          ...problem,
          ignored,
        }
      : problem;
  }

  extendTypes(types: Record<string, NodeType>, version: OasVersion) {
    let extendedTypes = types;
    for (const plugin of this.plugins) {
      if (plugin.typeExtension !== undefined) {
        switch (version) {
          case OasVersion.Version3_0:
          case OasVersion.Version3_1:
            if (!plugin.typeExtension.oas3) continue;
            extendedTypes = plugin.typeExtension.oas3(extendedTypes, version);
          case OasVersion.Version2:
            if (!plugin.typeExtension.oas2) continue;
            extendedTypes = plugin.typeExtension.oas2(extendedTypes, version);
          default:
            throw new Error('Not implemented');
        }
      }
    }
    return extendedTypes;
  }

  getRuleSettings(ruleId: string, oasVersion: OasVersion) {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);
    const settings = this.rules[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings,
      };
    } else {
      return { severity: 'error' as 'error', ...settings };
    }
  }

  getPreprocessorSettings(ruleId: string, oasVersion: OasVersion) {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);

    const settings = this.preprocessors[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings === 'on' ? ('error' as 'error') : settings,
      };
    } else {
      return { severity: 'error' as 'error', ...settings };
    }
  }

  getDecoratorSettings(ruleId: string, oasVersion: OasVersion) {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);
    const settings = this.decorators[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings === 'on' ? ('error' as 'error') : settings,
      };
    } else {
      return { severity: 'error' as 'error', ...settings };
    }
  }

  getUnusedRules() {
    const rules = [];
    const decorators = [];
    const preprocessors = [];

    for (const usedVersion of Array.from(this._usedVersions)) {
      rules.push(
        ...Object.keys(this.rules[usedVersion]).filter((name) => !this._usedRules.has(name)),
      );
      decorators.push(
        ...Object.keys(this.decorators[usedVersion]).filter((name) => !this._usedRules.has(name)),
      );
      preprocessors.push(
        ...Object.keys(this.preprocessors[usedVersion]).filter(
          (name) => !this._usedRules.has(name),
        ),
      );
    }

    return {
      rules,
      preprocessors,
      decorators,
    };
  }

  getRulesForOasVersion(version: OasMajorVersion) {
    switch (version) {
      case OasMajorVersion.Version3:
        const oas3Rules: Oas3RuleSet[] = []; // default ruleset
        this.plugins.forEach((p) => p.preprocessors?.oas3 && oas3Rules.push(p.preprocessors.oas3));
        this.plugins.forEach((p) => p.rules?.oas3 && oas3Rules.push(p.rules.oas3));
        this.plugins.forEach((p) => p.decorators?.oas3 && oas3Rules.push(p.decorators.oas3));
        return oas3Rules;
      case OasMajorVersion.Version2:
        const oas2Rules: Oas2RuleSet[] = []; // default ruleset
        this.plugins.forEach((p) => p.preprocessors?.oas2 && oas2Rules.push(p.preprocessors.oas2));
        this.plugins.forEach((p) => p.rules?.oas2 && oas2Rules.push(p.rules.oas2));
        this.plugins.forEach((p) => p.decorators?.oas2 && oas2Rules.push(p.decorators.oas2));
        return oas2Rules;
    }
  }

  skipRules(rules?: string[]) {
    for (const ruleId of rules || []) {
      for (const version of Object.values(OasVersion)) {
        if (this.rules[version][ruleId]) {
          this.rules[version][ruleId] = 'off';
        }
      }
    }
  }

  skipPreprocessors(preprocessors?: string[]) {
    for (const preprocessorId of preprocessors || []) {
      for (const version of Object.values(OasVersion)) {
        if (this.preprocessors[version][preprocessorId]) {
          this.preprocessors[version][preprocessorId] = 'off';
        }
      }
    }
  }

  skipDecorators(decorators?: string[]) {
    for (const decoratorId of decorators || []) {
      for (const version of Object.values(OasVersion)) {
        if (this.decorators[version][decoratorId]) {
          this.decorators[version][decoratorId] = 'off';
        }
      }
    }
  }
}

export class Config {
  referenceDocs: any;
  apiDefinitions: Record<string, string>;
  lint: LintConfig;
  resolve: ResolveConfig;
  constructor(public rawConfig: RawConfig, public configFile?: string) {
    this.apiDefinitions = rawConfig.apiDefinitions || {};
    this.lint = new LintConfig(rawConfig.lint || {}, configFile);
    this.referenceDocs = rawConfig.referenceDocs || {};
    this.resolve = {
      http: {
        headers: rawConfig?.resolve?.http?.headers ?? [],
        customFetch: undefined,
      },
    };
  }
}

function resolvePresets(presets: string[], plugins: Plugin[]) {
  return presets.map((presetName) => {
    const { pluginId, configName } = parsePresetName(presetName);

    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      throw new Error(`Invalid config ${red(presetName)}: plugin ${pluginId} is not included.`);
    }

    const preset = plugin.configs?.[configName]!;
    if (!preset) {
      throw new Error(
        pluginId
          ? `Invalid config ${red(
              presetName,
            )}: plugin ${pluginId} doesn't export config with name ${configName}.`
          : `Invalid config ${red(presetName)}: there is no such built-in config.`,
      );
    }
    return preset;
  });
}

function parsePresetName(presetName: string): { pluginId: string; configName: string } {
  if (presetName.indexOf('/') > -1) {
    const [pluginId, configName] = presetName.split('/');
    return { pluginId, configName };
  } else {
    return { pluginId: '', configName: presetName };
  }
}

function resolvePlugins(plugins: (string | Plugin)[] | null, configPath: string = ''): Plugin[] {
  if (!plugins) return [];

  // @ts-ignore
  const requireFunc = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;

  const seenPluginIds = new Map<string, string>();

  return plugins
    .map((p) => {
      // TODO: resolve npm packages similar to eslint
      const pluginModule =
        typeof p === 'string'
          ? (requireFunc(path.resolve(path.dirname(configPath), p)) as Plugin)
          : p;

      const id = pluginModule.id;
      if (typeof id !== 'string') {
        throw new Error(red(`Plugin must define \`id\` property in ${blue(p.toString())}.`));
      }

      if (seenPluginIds.has(id)) {
        const pluginPath = seenPluginIds.get(id)!;
        throw new Error(
          red(
            `Plugin "id" must be unique. Plugin ${blue(p.toString())} uses id "${blue(
              id,
            )}" already seen in ${blue(pluginPath)}`,
          ),
        );
      }

      seenPluginIds.set(id, p.toString());

      const plugin: Plugin = {
        id,
        ...(pluginModule.configs ? { configs: pluginModule.configs } : {}),
        ...(pluginModule.typeExtension ? { typeExtension: pluginModule.typeExtension } : {}),
      };

      if (pluginModule.rules) {
        if (!pluginModule.rules.oas3 && !pluginModule.rules.oas2) {
          throw new Error(`Plugin rules must have \`oas3\` or \`oas2\` rules "${p}.`);
        }
        plugin.rules = {};
        if (pluginModule.rules.oas3) {
          plugin.rules.oas3 = prefixRules(pluginModule.rules.oas3, id);
        }
        if (pluginModule.rules.oas2) {
          plugin.rules.oas2 = prefixRules(pluginModule.rules.oas2, id);
        }
      }
      if (pluginModule.preprocessors) {
        if (!pluginModule.preprocessors.oas3 && !pluginModule.preprocessors.oas2) {
          throw new Error(
            `Plugin \`preprocessors\` must have \`oas3\` or \`oas2\` preprocessors "${p}.`,
          );
        }
        plugin.preprocessors = {};
        if (pluginModule.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(pluginModule.preprocessors.oas3, id);
        }
        if (pluginModule.preprocessors.oas2) {
          plugin.preprocessors.oas2 = prefixRules(pluginModule.preprocessors.oas2, id);
        }
      }

      if (pluginModule.decorators) {
        if (!pluginModule.decorators.oas3 && !pluginModule.decorators.oas2) {
          throw new Error(`Plugin \`decorators\` must have \`oas3\` or \`oas2\` decorators "${p}.`);
        }
        plugin.decorators = {};
        if (pluginModule.decorators.oas3) {
          plugin.decorators.oas3 = prefixRules(pluginModule.decorators.oas3, id);
        }
        if (pluginModule.decorators.oas2) {
          plugin.decorators.oas2 = prefixRules(pluginModule.decorators.oas2, id);
        }
      }

      return plugin;
    })
    .filter(notUndefined);
}

function prefixRules<T extends Record<string, any>>(rules: T, prefix: string) {
  if (!prefix) return rules;

  const res: any = {};
  for (const name of Object.keys(rules)) {
    res[`${prefix}/${name}`] = rules[name];
  }

  return res;
}

type RulesFields =
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

function mergeExtends(rulesConfList: LintRawConfig[]) {
  const result: Omit<LintRawConfig, RulesFields> & Required<Pick<LintRawConfig, RulesFields>> = {
    rules: {},
    oas2Rules: {},
    oas3_0Rules: {},
    oas3_1Rules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},
    oas3_1Preprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
    oas3_1Decorators: {},
  };

  for (let rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `\`extends\` is not supported in shared configs yet: ${JSON.stringify(
          rulesConf,
          null,
          2,
        )}.`,
      );
    }

    Object.assign(result.rules, rulesConf.rules);
    Object.assign(result.oas2Rules, rulesConf.oas2Rules);
    assignExisting(result.oas2Rules, rulesConf.rules || {});
    Object.assign(result.oas3_0Rules, rulesConf.oas3_0Rules);
    assignExisting(result.oas3_0Rules, rulesConf.rules || {});
    Object.assign(result.oas3_1Rules, rulesConf.oas3_1Rules);
    assignExisting(result.oas3_1Rules, rulesConf.rules || {});

    Object.assign(result.preprocessors, rulesConf.preprocessors);
    Object.assign(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    assignExisting(result.oas2Preprocessors, rulesConf.preprocessors || {});
    Object.assign(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
    assignExisting(result.oas3_0Preprocessors, rulesConf.preprocessors || {});
    Object.assign(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
    assignExisting(result.oas3_1Preprocessors, rulesConf.preprocessors || {});

    Object.assign(result.decorators, rulesConf.decorators);
    Object.assign(result.oas2Decorators, rulesConf.oas2Decorators);
    assignExisting(result.oas2Decorators, rulesConf.decorators || {});
    Object.assign(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
    assignExisting(result.oas3_0Decorators, rulesConf.decorators || {});
    Object.assign(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
    assignExisting(result.oas3_1Decorators, rulesConf.decorators || {});
  }

  return result;
}

function assignExisting<T>(target: Record<string, T>, obj: Record<string, T>) {
  for (let k of Object.keys(obj)) {
    if (target.hasOwnProperty(k)) {
      target[k] = obj[k];
    }
  }
}
