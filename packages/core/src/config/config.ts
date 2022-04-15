import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { parseYaml, stringifyYaml } from '../js-yaml';
import { slash } from '../utils';
import { NormalizedProblem } from '../walk';
import { OasVersion, OasMajorVersion, Oas2RuleSet, Oas3RuleSet } from '../oas-types';

import type { NodeType } from '../types';
import type {
  DecoratorConfig,
  Plugin,
  PreprocessorConfig,
  Region,
  ResolveConfig,
  ResolvedApi,
  ResolvedConfig,
  RuleConfig,
  TransformLintConfig,
} from './types';
import { getResolveConfig } from './utils';

export const IGNORE_FILE = '.redocly.lint-ignore.yaml';
const IGNORE_BANNER =
  `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.\n` +
  `# See https://redoc.ly/docs/cli/ for more information.\n`;

export const DEFAULT_REGION = 'us';
const REDOCLY_DOMAIN = process.env.REDOCLY_DOMAIN;
export const DOMAINS: { [region in Region]: string } = {
  us: 'redocly.com',
  eu: 'eu.redocly.com',
};

// FIXME: temporary fix for our lab environments
if (REDOCLY_DOMAIN?.endsWith('.redocly.host')) {
  DOMAINS[REDOCLY_DOMAIN.split('.')[0] as Region] = REDOCLY_DOMAIN;
}
if (REDOCLY_DOMAIN === 'redoc.online') {
  DOMAINS[REDOCLY_DOMAIN as Region] = REDOCLY_DOMAIN;
}
export const AVAILABLE_REGIONS = Object.keys(DOMAINS) as Region[];

export class LintConfig {
  plugins: Plugin[];
  ignore: Record<string, Record<string, Set<string>>> = {};
  doNotResolveExamples: boolean;
  rules: Record<OasVersion, Record<string, RuleConfig>>;
  preprocessors: Record<OasVersion, Record<string, PreprocessorConfig>>;
  decorators: Record<OasVersion, Record<string, DecoratorConfig>>;

  private _usedRules: Set<string> = new Set();
  private _usedVersions: Set<OasVersion> = new Set();

  recommendedFallback: boolean;

  constructor(public rawConfig: TransformLintConfig, public configFile?: string) {
    this.plugins = rawConfig.plugins || [];
    this.doNotResolveExamples = !!rawConfig.doNotResolveExamples;

    this.recommendedFallback = rawConfig.recommendedFallback || false

    this.rules = rawConfig.rules;
    this.preprocessors = rawConfig.preprocessors;
    this.decorators = rawConfig.decorators;

    const dir = this.configFile
      ? path.dirname(this.configFile)
      : (typeof process !== 'undefined' && process.cwd()) || '';
    const ignoreFile = path.join(dir, IGNORE_FILE);

    /* no crash when using it on the client */
    if (fs.hasOwnProperty('existsSync') && fs.existsSync(ignoreFile)) {
      // TODO: parse errors
      this.ignore =
        (parseYaml(fs.readFileSync(ignoreFile, 'utf-8')) as Record<
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
      const ignoredRules = (mapped[slash(path.relative(dir, absFileName))] =
        this.ignore[absFileName]);
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
  apis: Record<string, ResolvedApi>;
  lint: LintConfig;
  resolve: ResolveConfig;
  licenseKey?: string;
  region?: Region;
  'features.openapi': Record<string, any>;
  'features.mockServer'?: Record<string, any>;
  organization?: string;
  constructor(public rawConfig: ResolvedConfig, public configFile?: string) {
    this.apis = rawConfig.apis || {};
    this.lint = new LintConfig(rawConfig.lint || {}, configFile);
    this['features.openapi'] = rawConfig['features.openapi'] || {};
    this['features.mockServer'] = rawConfig['features.mockServer'] || {};
    this.resolve = getResolveConfig(rawConfig?.resolve);
    this.region = rawConfig.region;
    this.organization = rawConfig.organization;
  }
}
