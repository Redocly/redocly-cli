import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseYaml, stringifyYaml } from '../js-yaml/index.js';
import { slash } from '../utils/slash.js';
import { doesYamlFileExist } from '../utils/does-yaml-file-exist.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { specVersions } from '../detect-spec.js';
import { isBrowser } from '../env.js';
import { getResolveConfig } from './get-resolve-config.js';
import { isAbsoluteUrl } from '../ref-utils.js';
import { groupAssertionRules } from './group-assertion-rules.js';
import { IGNORE_BANNER, IGNORE_FILE } from './constants.js';

import type { Document, ResolvedRefMap } from '../resolve.js';
import type { NormalizedProblem } from '../walk.js';
import type {
  Oas2RuleSet,
  Oas3RuleSet,
  Async2RuleSet,
  Async3RuleSet,
  Arazzo1RuleSet,
  Overlay1RuleSet,
  SpecVersion,
  SpecMajorVersion,
} from '../oas-types.js';
import type { NodeType } from '../types/index.js';
import type {
  DecoratorConfig,
  Plugin,
  PreprocessorConfig,
  ResolveConfig,
  ResolvedConfig,
  RuleConfig,
  RuleSettings,
} from './types.js';

function getIgnoreFilePath(configPath?: string): string | undefined {
  if (configPath) {
    return doesYamlFileExist(configPath)
      ? path.join(path.dirname(configPath), IGNORE_FILE)
      : path.join(configPath, IGNORE_FILE);
  } else {
    return isBrowser ? undefined : path.join(process.cwd(), IGNORE_FILE);
  }
}

export class Config {
  resolvedConfig: ResolvedConfig;
  configPath?: string;
  document?: Document;
  resolvedRefMap?: ResolvedRefMap;
  resolve: ResolveConfig;
  _alias?: string;

  plugins: Plugin[];
  ignore: Record<string, Record<string, Set<string>>> = {};
  doNotResolveExamples: boolean;
  rules: Record<SpecVersion, Record<string, RuleConfig>>;
  preprocessors: Record<SpecVersion, Record<string, PreprocessorConfig>>;
  decorators: Record<SpecVersion, Record<string, DecoratorConfig>>;

  private _usedRules: Set<string> = new Set();
  private _usedVersions: Set<SpecVersion> = new Set();

  constructor(
    resolvedConfig: ResolvedConfig,
    opts: {
      configPath?: string;
      document?: Document;
      resolvedRefMap?: ResolvedRefMap;
      alias?: string;
      plugins?: Plugin[];
    } = {}
  ) {
    this.resolvedConfig = resolvedConfig;
    this.configPath = opts.configPath;
    this.document = opts.document;
    this.resolvedRefMap = opts.resolvedRefMap;
    this.resolve = getResolveConfig(this.resolvedConfig.resolve);
    this._alias = opts.alias;

    this.plugins = opts.plugins || [];
    this.doNotResolveExamples = !!resolvedConfig.resolve?.doNotResolveExamples;

    const group = (rules: Record<string, RuleConfig>) => {
      return groupAssertionRules({ rules }, this.plugins);
    };

    this.rules = {
      oas2: group({ ...resolvedConfig.rules, ...resolvedConfig.oas2Rules }),
      oas3_0: group({ ...resolvedConfig.rules, ...resolvedConfig.oas3_0Rules }),
      oas3_1: group({ ...resolvedConfig.rules, ...resolvedConfig.oas3_1Rules }),
      oas3_2: group({ ...resolvedConfig.rules, ...resolvedConfig.oas3_2Rules }),
      async2: group({ ...resolvedConfig.rules, ...resolvedConfig.async2Rules }),
      async3: group({ ...resolvedConfig.rules, ...resolvedConfig.async3Rules }),
      arazzo1: group({ ...resolvedConfig.rules, ...resolvedConfig.arazzo1Rules }),
      overlay1: group({ ...resolvedConfig.rules, ...resolvedConfig.overlay1Rules }),
    };

    this.preprocessors = {
      oas2: { ...resolvedConfig.preprocessors, ...resolvedConfig.oas2Preprocessors },
      oas3_0: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.oas3_0Preprocessors,
      },
      oas3_1: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.oas3_1Preprocessors,
      },
      oas3_2: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.oas3_2Preprocessors,
      },
      async2: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.async2Preprocessors,
      },
      async3: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.async3Preprocessors,
      },
      arazzo1: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.arazzo1Preprocessors,
      },
      overlay1: {
        ...resolvedConfig.preprocessors,
        ...resolvedConfig.overlay1Preprocessors,
      },
    };

    this.decorators = {
      oas2: { ...resolvedConfig.decorators, ...resolvedConfig.oas2Decorators },
      oas3_0: { ...resolvedConfig.decorators, ...resolvedConfig.oas3_0Decorators },
      oas3_1: { ...resolvedConfig.decorators, ...resolvedConfig.oas3_1Decorators },
      oas3_2: { ...resolvedConfig.decorators, ...resolvedConfig.oas3_2Decorators },
      async2: { ...resolvedConfig.decorators, ...resolvedConfig.async2Decorators },
      async3: { ...resolvedConfig.decorators, ...resolvedConfig.async3Decorators },
      arazzo1: { ...resolvedConfig.decorators, ...resolvedConfig.arazzo1Decorators },
      overlay1: {
        ...resolvedConfig.decorators,
        ...resolvedConfig.overlay1Decorators,
      },
    };

    this.resolveIgnore(getIgnoreFilePath(opts.configPath));
  }

  forAlias(alias?: string) {
    if (alias === undefined || !isPlainObject(this.resolvedConfig?.apis?.[alias])) {
      return this;
    }

    const { apis, ...rest } = this.resolvedConfig;
    const { root: _root, output: _output, ...aliasConfig } = apis[alias];
    return new Config(
      { ...rest, ...aliasConfig },
      {
        configPath: this.configPath,
        document: this.document,
        resolvedRefMap: this.resolvedRefMap,
        alias,
        plugins: this.plugins,
      }
    );
  }

  resolveIgnore(ignoreFile?: string) {
    if (!ignoreFile || !doesYamlFileExist(ignoreFile)) return;

    this.ignore =
      (parseYaml(fs.readFileSync(ignoreFile, 'utf-8')) as Record<
        string,
        Record<string, Set<string>>
      >) || {};

    // resolve ignore paths
    for (const fileName of Object.keys(this.ignore)) {
      this.ignore[
        isAbsoluteUrl(fileName) ? fileName : path.resolve(path.dirname(ignoreFile), fileName)
      ] = this.ignore[fileName];

      for (const ruleId of Object.keys(this.ignore[fileName])) {
        this.ignore[fileName][ruleId] = new Set(this.ignore[fileName][ruleId]);
      }

      if (!isAbsoluteUrl(fileName)) {
        delete this.ignore[fileName];
      }
    }
  }

  saveIgnore() {
    const dir = this.configPath ? path.dirname(this.configPath) : process.cwd();
    const ignoreFile = path.join(dir, IGNORE_FILE);
    const mapped: Record<string, any> = {};
    for (const absFileName of Object.keys(this.ignore)) {
      const mappedDefinitionName = isAbsoluteUrl(absFileName)
        ? absFileName
        : slash(path.relative(dir, absFileName));
      const ignoredRules = (mapped[mappedDefinitionName] = this.ignore[absFileName]);

      for (const ruleId of Object.keys(ignoredRules)) {
        ignoredRules[ruleId] = Array.from(ignoredRules[ruleId]) as any;
      }
    }
    fs.writeFileSync(ignoreFile, IGNORE_BANNER + stringifyYaml(mapped));
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

  extendTypes(types: Record<string, NodeType>, version: SpecVersion) {
    let extendedTypes = types;
    for (const plugin of this.plugins) {
      if (plugin.typeExtension !== undefined) {
        switch (version) {
          case 'oas3_0':
          case 'oas3_1':
          case 'oas3_2':
            if (!plugin.typeExtension.oas3) continue;
            extendedTypes = plugin.typeExtension.oas3(extendedTypes, version);
            break;
          case 'oas2':
            if (!plugin.typeExtension.oas2) continue;
            extendedTypes = plugin.typeExtension.oas2(extendedTypes, version);
            break;
          case 'async2':
            if (!plugin.typeExtension.async2) continue;
            extendedTypes = plugin.typeExtension.async2(extendedTypes, version);
            break;
          case 'async3':
            if (!plugin.typeExtension.async3) continue;
            extendedTypes = plugin.typeExtension.async3(extendedTypes, version);
            break;
          case 'arazzo1':
            if (!plugin.typeExtension.arazzo1) continue;
            extendedTypes = plugin.typeExtension.arazzo1(extendedTypes, version);
            break;
          case 'overlay1':
            if (!plugin.typeExtension.overlay1) continue;
            extendedTypes = plugin.typeExtension.overlay1(extendedTypes, version);
            break;
          default:
            throw new Error('Not implemented');
        }
      }
    }
    return extendedTypes;
  }

  getRuleSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);
    const settings = this.rules[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings,
      };
    } else {
      return { severity: 'error', ...settings };
    }
  }

  getPreprocessorSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);

    const settings = this.preprocessors[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings === 'on' ? 'error' : settings,
      };
    } else {
      return { severity: 'error', ...settings };
    }
  }

  getDecoratorSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings {
    this._usedRules.add(ruleId);
    this._usedVersions.add(oasVersion);
    const settings = this.decorators[oasVersion][ruleId] || 'off';
    if (typeof settings === 'string') {
      return {
        severity: settings === 'on' ? 'error' : settings,
      };
    } else {
      return { severity: 'error', ...settings };
    }
  }

  getUnusedRules() {
    const rules = [];
    const decorators = [];
    const preprocessors = [];

    for (const usedVersion of Array.from(this._usedVersions)) {
      rules.push(
        ...Object.keys(this.rules[usedVersion]).filter((name) => !this._usedRules.has(name))
      );
      decorators.push(
        ...Object.keys(this.decorators[usedVersion]).filter((name) => !this._usedRules.has(name))
      );
      preprocessors.push(
        ...Object.keys(this.preprocessors[usedVersion]).filter((name) => !this._usedRules.has(name))
      );
    }

    return {
      rules,
      preprocessors,
      decorators,
    };
  }

  // TODO: add default case for redocly.yaml
  getRulesForSpecVersion(version: SpecMajorVersion) {
    switch (version) {
      case 'oas3':
        // eslint-disable-next-line no-case-declarations
        const oas3Rules: Oas3RuleSet[] = [];
        this.plugins.forEach((p) => p.preprocessors?.oas3 && oas3Rules.push(p.preprocessors.oas3));
        this.plugins.forEach((p) => p.rules?.oas3 && oas3Rules.push(p.rules.oas3));
        this.plugins.forEach((p) => p.decorators?.oas3 && oas3Rules.push(p.decorators.oas3));
        return oas3Rules;
      case 'oas2':
        // eslint-disable-next-line no-case-declarations
        const oas2Rules: Oas2RuleSet[] = [];
        this.plugins.forEach((p) => p.preprocessors?.oas2 && oas2Rules.push(p.preprocessors.oas2));
        this.plugins.forEach((p) => p.rules?.oas2 && oas2Rules.push(p.rules.oas2));
        this.plugins.forEach((p) => p.decorators?.oas2 && oas2Rules.push(p.decorators.oas2));
        return oas2Rules;
      case 'async2':
        // eslint-disable-next-line no-case-declarations
        const asyncApi2Rules: Async2RuleSet[] = [];
        this.plugins.forEach(
          (p) => p.preprocessors?.async2 && asyncApi2Rules.push(p.preprocessors.async2)
        );
        this.plugins.forEach((p) => p.rules?.async2 && asyncApi2Rules.push(p.rules.async2));
        this.plugins.forEach(
          (p) => p.decorators?.async2 && asyncApi2Rules.push(p.decorators.async2)
        );
        return asyncApi2Rules;
      case 'async3':
        // eslint-disable-next-line no-case-declarations
        const asyncApi3Rules: Async3RuleSet[] = [];
        this.plugins.forEach(
          (p) => p.preprocessors?.async3 && asyncApi3Rules.push(p.preprocessors.async3)
        );
        this.plugins.forEach((p) => p.rules?.async3 && asyncApi3Rules.push(p.rules.async3));
        this.plugins.forEach(
          (p) => p.decorators?.async3 && asyncApi3Rules.push(p.decorators.async3)
        );
        return asyncApi3Rules;
      case 'arazzo1':
        // eslint-disable-next-line no-case-declarations
        const arazzo1Rules: Arazzo1RuleSet[] = [];
        this.plugins.forEach(
          (p) => p.preprocessors?.arazzo1 && arazzo1Rules.push(p.preprocessors.arazzo1)
        );
        this.plugins.forEach((p) => p.rules?.arazzo1 && arazzo1Rules.push(p.rules.arazzo1));
        this.plugins.forEach(
          (p) => p.decorators?.arazzo1 && arazzo1Rules.push(p.decorators.arazzo1)
        );
        return arazzo1Rules;
      case 'overlay1':
        // eslint-disable-next-line no-case-declarations
        const overlay1Rules: Overlay1RuleSet[] = [];
        this.plugins.forEach(
          (p) => p.preprocessors?.overlay1 && overlay1Rules.push(p.preprocessors.overlay1)
        );
        this.plugins.forEach((p) => p.rules?.overlay1 && overlay1Rules.push(p.rules.overlay1));
        this.plugins.forEach(
          (p) => p.decorators?.overlay1 && overlay1Rules.push(p.decorators.overlay1)
        );
        return overlay1Rules;
    }
  }

  skipRules(rules?: string[]) {
    for (const ruleId of rules || []) {
      for (const version of specVersions) {
        if (this.rules[version][ruleId]) {
          this.rules[version][ruleId] = 'off';
        } else if (Array.isArray(this.rules[version].assertions)) {
          // skip assertions
          for (const configurableRule of this.rules[version].assertions) {
            if (configurableRule.assertionId === ruleId) {
              configurableRule.severity = 'off';
            }
          }
        }
      }
    }
  }

  skipPreprocessors(preprocessors?: string[]) {
    for (const preprocessorId of preprocessors || []) {
      for (const version of specVersions) {
        if (this.preprocessors[version][preprocessorId]) {
          this.preprocessors[version][preprocessorId] = 'off';
        }
      }
    }
  }

  skipDecorators(decorators?: string[]) {
    for (const decoratorId of decorators || []) {
      for (const version of specVersions) {
        if (this.decorators[version][decoratorId]) {
          this.decorators[version][decoratorId] = 'off';
        }
      }
    }
  }
}
