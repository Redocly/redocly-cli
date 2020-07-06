import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { builtInConfigs } from './builtIn';
import * as builtinRules from '../rules/builtin';
import { loadYaml, notUndefined } from '../utils';

import {
  OasVersion,
  Oas3PreprocessorsSet,
  OasMajorVersion,
  Oas3DecoratorsSet,
  Oas2RuleSet,
  Oas2PreprocessorsSet,
  Oas2DecoratorsSet,
} from '../validate';

import { MessageSeverity, NormalizedReportMessage } from '../walk';
import { Oas3RuleSet } from '../validate';

import recommended from './recommended';
import { red, blue } from 'colorette';
import { NodeType } from '../types';
import { dirname } from 'path';

const IGNORE_FILE = '.redocly.lint-ignore.yaml';
const IGNORE_BANNER =
  `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.\n` +
  `# See https://redoc.ly/docs/cli/ for more information.\n`;

export type RuleConfig =
  | MessageSeverity
  | 'off'
  | ({
      severity?: MessageSeverity;
    } & Record<string, any>);

export type PreprocessorConfig =
  | MessageSeverity
  | 'off'
  | 'on'
  | {
      severity?: MessageSeverity;
      options?: Record<string, any>;
    };

export type DecoratorConfig = PreprocessorConfig;

export type LintRawConfig = {
  plugins?: (string | Plugin)[];
  extends?: string[];

  rules?: Record<string, RuleConfig>;
  oas2Rules?: Record<string, RuleConfig>;
  oas3_0Rules?: Record<string, RuleConfig>;

  preprocessors?: Record<string, PreprocessorConfig>;
  oas2Preprocessors?: Record<string, PreprocessorConfig>;
  oas3_0Preprocessors?: Record<string, PreprocessorConfig>;

  decorators?: Record<string, DecoratorConfig>;
  oas2Decorators?: Record<string, DecoratorConfig>;
  oas3_0Decorators?: Record<string, DecoratorConfig>;
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

  rules: Record<OasVersion, Record<string, RuleConfig>>;
  preprocessors: Record<OasVersion, Record<string, PreprocessorConfig>>;
  decorators: Record<OasVersion, Record<string, DecoratorConfig>>;

  private _usedRules: Set<string> = new Set();
  private _usedVersions: Set<OasVersion> = new Set();

  constructor(public rawConfig: LintRawConfig, public configFile?: string) {
    this.plugins = rawConfig.plugins ? resolvePlugins(rawConfig.plugins, configFile) : [];

    this.plugins.push({
      id: '', // default plugin doesn't have id
      rules: builtinRules.rules,
      preprocessors: builtinRules.preprocessors,
      decorators: builtinRules.decorators,
    });

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
    };

    this.preprocessors = {
      [OasVersion.Version2]: { ...merged.preprocessors, ...merged.oas2Preprocessors },
      [OasVersion.Version3_0]: { ...merged.preprocessors, ...merged.oas3_0Preprocessors },
    };

    this.decorators = {
      [OasVersion.Version2]: { ...merged.decorators, ...merged.oas2Decorators },
      [OasVersion.Version3_0]: { ...merged.decorators, ...merged.oas3_0Decorators },
    };

    const dir = this.configFile ? path.dirname(this.configFile) : process.cwd();
    const ignoreFile = path.join(dir, IGNORE_FILE);

    if (fs.existsSync(ignoreFile)) {
      // TODO: parse errors
      this.ignore = yaml.safeLoad(fs.readFileSync(ignoreFile, 'utf-8'));

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

  addIgnore(message: NormalizedReportMessage) {
    const ignore = this.ignore;
    const loc = message.location[0];
    if (loc.pointer === undefined) return;

    const fileIgnore = (ignore[loc.source.absoluteRef] = ignore[loc.source.absoluteRef] || {});
    const ruleIgnore = (fileIgnore[message.ruleId] = fileIgnore[message.ruleId] || new Set());

    ruleIgnore.add(loc.pointer);
  }

  addMessageToIgnore(message: NormalizedReportMessage) {
    const loc = message.location[0];
    if (loc.pointer === undefined) return message;

    const fileIgnore = this.ignore[loc.source.absoluteRef] || {};
    const ruleIgnore = fileIgnore[message.ruleId];
    const ignored = ruleIgnore && ruleIgnore.has(loc.pointer);
    return ignored
      ? {
          ...message,
          ignored,
        }
      : message;
  }

  extendTypes(types: Record<string, NodeType>, version: OasVersion) {
    let extendedTypes = types;
    for (const plugin of this.plugins) {
      if (plugin.typeExtension !== undefined) {
        switch (version) {
          case OasVersion.Version3_0:
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
        customFetch: undefined
      },
    };
  }
}

export async function loadConfig(configPath?: string): Promise<Config> {
  if (configPath === undefined) {
    configPath = await findConfig();
  }

  let rawConfig: RawConfig = {};
  // let resolvedPlugins: Plugin[] = [];

  if (configPath !== undefined) {
    try {
      rawConfig = await loadYaml(configPath);
    } catch (e) {
      throw new Error(`Error parsing config file at \`${configPath}\`: ${e.message}`);
    }
  }

  return new Config(rawConfig, configPath);
}

async function findConfig() {
  if (await existsAsync('.redocly.yaml')) {
    return '.redocly.yaml';
  } else if (await existsAsync('.redocly.yml')) {
    return '.redocly.yml';
  }
  return undefined;
}

function existsAsync(path: string) {
  return new Promise(function (resolve) {
    fs.exists(path, resolve);
  });
}

function resolvePresets(presets: string[], plugins: Plugin[]) {
  return presets.map((presetName) => {
    let preset = builtInConfigs[presetName];
    if (!preset && presetName.indexOf('/') > -1) {
      const [pluginName, configName] = presetName.split('/');
      const plugin = plugins.find((p) => p.id === pluginName);
      if (!plugin) {
        throw new Error(`Invalid preset ${red(presetName)}: plugin ${pluginName} is not included`);
      }

      preset = plugin.configs?.[configName]!;
      if (!preset) {
        throw new Error(
          `Invalid preset ${red(
            presetName,
          )}: plugin ${pluginName} doesn't export config with name ${configName}`,
        );
      }
      return preset;
    }

    if (!preset) {
      throw new Error(`Invalid preset ${red(presetName)}: no such built-in preset`);
    }
    return preset;
  });
}

function resolvePlugins(plugins: (string | Plugin)[] | null, configPath: string = ''): Plugin[] {
  if (!plugins) return [];

  return plugins
    .map((p) => {
      // TODO: resolve npm packages similar to eslint
      const plugin =
        typeof p === 'string' ? (require(path.resolve(path.dirname(configPath), p)) as Plugin) : p;

      const id = plugin.id;
      if (!id) {
        throw new Error(red(`Plugin must define \`id\` property in ${blue(p.toString())}`));
      }

      if (plugin.rules) {
        if (!plugin.rules.oas3 && !plugin.rules.oas2) {
          throw new Error(`Plugin rules must have \`oas3\` or \`oas2\` rules "${p}}`);
        }
        if (plugin.rules.oas3) {
          plugin.rules.oas3 = prefixRules(plugin.rules.oas3, id);
        }
        if (plugin.rules.oas2) {
          plugin.rules.oas2 = prefixRules(plugin.rules.oas2, id);
        }
      }
      if (plugin.preprocessors) {
        if (!plugin.preprocessors.oas3 && !plugin.preprocessors.oas2) {
          throw new Error(
            `Plugin \`preprocessors\` must have \`oas3\` or \`oas2\` preprocessors "${p}}`,
          );
        }
        if (plugin.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(plugin.preprocessors.oas3, id);
        }
        if (plugin.preprocessors.oas2) {
          plugin.preprocessors.oas2 = prefixRules(plugin.preprocessors.oas2, id);
        }
      }

      if (plugin.decorators) {
        if (!plugin.decorators.oas3 && !plugin.decorators.oas2) {
          throw new Error(`Plugin \`decorators\` must have \`oas3\` or \`oas2\` decorators "${p}}`);
        }
        if (plugin.decorators.oas3) {
          plugin.decorators.oas3 = prefixRules(plugin.decorators.oas3, id);
        }
        if (plugin.decorators.oas2) {
          plugin.decorators.oas2 = prefixRules(plugin.decorators.oas2, id);
        }
      }

      return plugin;
    })
    .filter(notUndefined);
}

function prefixRules<T extends Record<string, any>>(rules: T, prefix: string) {
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
  | 'preprocessors'
  | 'oas2Preprocessors'
  | 'oas3_0Preprocessors'
  | 'decorators'
  | 'oas2Decorators'
  | 'oas3_0Decorators';

function mergeExtends(rulesConfList: LintRawConfig[]) {
  const result: Omit<LintRawConfig, RulesFields> & Required<Pick<LintRawConfig, RulesFields>> = {
    rules: {},
    oas2Rules: {},
    oas3_0Rules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
  };

  for (let rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `\`extends\` is not supported yet in shared configs: ${JSON.stringify(rulesConf, null, 2)}`,
      );
    }
    Object.assign(result.rules, rulesConf.rules);
    Object.assign(result.oas2Rules, rulesConf.oas2Rules);
    Object.assign(result.oas3_0Rules, rulesConf.oas3_0Rules);

    Object.assign(result.preprocessors, rulesConf.preprocessors);
    Object.assign(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    Object.assign(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);

    Object.assign(result.decorators, rulesConf.decorators);
    Object.assign(result.oas2Decorators, rulesConf.oas2Decorators);
    Object.assign(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
  }

  return result;
}
