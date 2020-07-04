import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { builtInConfigs } from './builtIn';
import * as builtinRules from '../rules/builtin';
import { loadYaml, notUndefined } from '../utils';

import { OasVersion, Oas3PreprocessorsSet, OasMajorVersion } from '../validate';

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

export type RulesConfig = {
  plugins?: (string | Plugin)[];
  extends?: string[];
  rules?: Record<string, RuleConfig>;
  preprocessors?: Record<string, PreprocessorConfig>;
};

export type PreprocessorsConfig = {
  oas3?: Oas3PreprocessorsSet;
  oas2?: any; // TODO: implement Oas2
};

export type TypesExtensionFn = (
  types: Record<string, NodeType>,
  oasVersion: OasVersion,
) => Record<string, NodeType>;

export type TypeExtensionsConfig = Partial<Record<OasMajorVersion, TypesExtensionFn>>;
export type CustomRulesConfig = {
  oas3?: Oas3RuleSet;
  oas2?: any; // TODO: implement Oas2
};

export type Plugin = {
  id: string;
  configs?: Record<string, RulesConfig>;
  rules?: CustomRulesConfig;
  preprocessors?: PreprocessorsConfig;
  typeExtension?: TypeExtensionsConfig;
};

export type RawConfig = {
  apiDefinitions?: Record<string, string>;
  lint?: RulesConfig;
};

export class LintConfig {
  plugins: Plugin[];
  rules: Record<string, RuleConfig>;
  preprocessors: Record<string, PreprocessorConfig>;
  ignore: Record<string, Record<string, Set<string>>> = {};

  private _usedRules: Set<string> = new Set();

  constructor(public rawConfig: RulesConfig, public configFile?: string) {
    this.plugins = rawConfig.plugins ? resolvePlugins(rawConfig.plugins, configFile) : [];

    this.plugins.push({
      id: '', // default plugin doesn't have id
      rules:  builtinRules.rules,
      preprocessors: builtinRules.preprocessors
    });

    const extendConfigs: RulesConfig[] = rawConfig.extends
      ? resolvePresets(rawConfig.extends, this.plugins)
      : [recommended];

    if (rawConfig.rules || rawConfig.preprocessors)
      extendConfigs.push({
        rules: rawConfig.rules,
        preprocessors: rawConfig.preprocessors,
      });

    const merged = mergeExtends(extendConfigs);
    this.rules = merged.rules;

    this.preprocessors = merged.preprocessors;

    const dir = this.configFile ? path.dirname(this.configFile) : process.cwd();
    const ignoreFile = path.join(dir, IGNORE_FILE);

    if (fs.existsSync(ignoreFile)) {
      this.ignore = yaml.safeLoad(fs.readFileSync(ignoreFile, 'utf-8')); // TODO: parse errors

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

  addException(message: NormalizedReportMessage) {
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

  getRuleSettings(ruleId: string) {
    this._usedRules.add(ruleId);
    const settings = this.rules[ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings,
      };
    } else {
      return { severity: 'error' as 'error', ...settings };
    }
  }

  getPreprocessorSettings(ruleId: string) {
    this._usedRules.add(ruleId);
    const settings = this.preprocessors[ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings === 'on' ? ('error' as 'error') : settings,
      };
    } else {
      return { severity: 'error' as 'error', ...settings };
    }
  }

  getUnusedRules() {
    return {
      rules: Object.keys(this.rules).filter((name) => !this._usedRules.has(name)),
      preprocessors: Object.keys(this.preprocessors).filter((name) => !this._usedRules.has(name)),
    };
  }

  getRulesForOasVersion(version: OasVersion) {
    switch (version) {
      case OasVersion.Version3_0:
        const oas3Rules: Oas3RuleSet[] = []; // default ruleset
        this.plugins.forEach((p) => p.preprocessors?.oas3 && oas3Rules.push(p.preprocessors.oas3));
        this.plugins.forEach((p) => p.rules?.oas3 && oas3Rules.push(p.rules.oas3));
        return oas3Rules;
      default:
        throw new Error('Not implemented');
    }
  }

  skipRules(rules?: string[]) {
    for (const ruleId of rules || []) {
      if (this.rules[ruleId]) {
        this.rules[ruleId] = 'off';
      }
    }
  }

  skipPreprocessors(preprocessors?: string[]) {
    for (const preprocessorId of preprocessors || []) {
      if (this.preprocessors[preprocessorId]) {
        this.preprocessors[preprocessorId] = 'off';
      }
    }
  }
}

export class Config {
  apiDefinitions: Record<string, string>;
  lint: LintConfig;
  constructor(public rawConfig: RawConfig, public configFile?: string) {
    this.apiDefinitions = rawConfig.apiDefinitions || {};
    this.lint = new LintConfig(rawConfig.lint || {}, configFile);
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
          plugin.rules.oas3 = prefixRules(plugin.rules.oas2, id);
        }
      }
      if (plugin.preprocessors) {
        if (!plugin.preprocessors.oas3 && !plugin.preprocessors.oas2) {
          throw new Error(`Plugin \`preprocessors\` must have \`oas3\` or \`oas2\` preprocessors "${p}}`);
        }
        if (plugin.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(plugin.preprocessors.oas3, id);
        }
        if (plugin.preprocessors.oas2) {
          plugin.preprocessors.oas3 = prefixRules(plugin.preprocessors.oas2, id);
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

function mergeExtends(rulesConfList: RulesConfig[]) {
  const result: Omit<RulesConfig, 'rules' | 'preprocessors'> &
    Required<Pick<RulesConfig, 'rules' | 'preprocessors'>> = {
    rules: {},
    preprocessors: {},
  };

  for (let rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `\`extends\` is not supported yet in shared configs: ${JSON.stringify(rulesConf, null, 2)}`,
      );
    }
    Object.assign(result.rules, rulesConf.rules);
    Object.assign(result.preprocessors, rulesConf.preprocessors);
  }

  return result;
}
