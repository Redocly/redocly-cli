import * as fs from 'fs';
import * as path from 'path';

import { builtInConfigs } from './builtIn';
import { rules as builtinRules } from '../rules/builtin';
import { loadYaml, notUndefined } from '../utils';
import oas3 from '../rules/oas3';
import { OASVersion } from '../validate';

import { MessageSeverity } from '../walk';
import { OAS3RuleSet } from '../validate';

import recommended from './recommended';
import { red, blue } from 'colorette';

export type RuleConfig =
  | MessageSeverity
  | 'off'
  | {
      severity: MessageSeverity;
      options?: Record<string, any>;
    };

export type RulesConfig = {
  plugins?: (string | Plugin)[];
  extends?: string[];
  rules?: Record<string, RuleConfig>;
};

export type Plugin = {
  id: string;
  configs?: Record<string, RulesConfig>;
  rules?: {
    oas3?: OAS3RuleSet;
    oas2?: any; // TODO
  };
};

export type RawConfig = {
  apiDefinitions?: Record<string, string>;
  lint?: RulesConfig;
};

export class LintConfig {
  plugins: Plugin[];
  rules: Record<string, RuleConfig>;

  definedRules: { oas3: OAS3RuleSet[] } = {
    oas3: [],
  };

  constructor(public rawConfig: RulesConfig, configFile?: string) {
    this.plugins = rawConfig.plugins ? resolvePlugins(rawConfig.plugins, configFile) : [];

    this.plugins.push({
      id: '', // default plugin doesn't have id
      rules: {
        oas3: oas3,
      },
    });

    const extendConfigs: RulesConfig[] = rawConfig.extends
      ? resolvePresets(rawConfig.extends, this.plugins)
      : [recommended];

    if (rawConfig.rules)
      extendConfigs.push({
        rules: rawConfig.rules,
      });

    this.rules = mergeExtends(extendConfigs).rules;
  }

  getRuleSettings(ruleId: string) {
    const settings = this.rules[ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings,
        options: undefined,
      };
    } else {
      // @ts-ignore
      return { severity: 'error', ...settings };
    }
  }

  getRulesForOASVersion(version: OASVersion) {
    switch (version) {
      case OASVersion.Version3_0_x:
        const oas3Rules: OAS3RuleSet[] = []; // default ruleset
        this.plugins.forEach((p) => p.rules?.oas3 && oas3Rules.push(p.rules.oas3));
        return oas3Rules;
      default:
        throw new Error('Not implemented');
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
          )}: plugin ${pluginName} doesnt export config with name ${configName}`,
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
      // todo: resolve npm packages similar to eslint
      if (typeof p === 'string') {
        if (builtinRules[p]) return undefined;
      }
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
  const result: Omit<RulesConfig, 'rules'> & Required<Pick<RulesConfig, 'rules'>> = {
    rules: {},
  };

  for (let rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `\`extends\` is not supported yet in shared configs: ${JSON.stringify(rulesConf, null, 2)}`,
      );
    }
    Object.assign(result.rules, rulesConf.rules);
  }

  return result;
}
