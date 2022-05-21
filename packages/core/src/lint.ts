import { BaseResolver, resolveDocument, Document, makeDocumentFromString } from './resolve';
import {
  normalizeVisitors,
} from './visitors';
import { Oas3_1Types } from './types/oas3_1';
import { Oas3Types } from './types/oas3';
import { Oas2Types } from './types/oas2';
import { NodeType } from './types';
import { ProblemSeverity, WalkContext, walkDocument } from './walk';
import { LintConfig, Config, initRules, defaultPlugin, resolvePlugins } from './config';
import { normalizeTypes } from './types';
import { releaseAjvInstance } from './rules/ajv';
import { detectOpenAPI, Oas3RuleSet, OasMajorVersion, OasVersion, openAPIMajor } from './oas-types';
import { ConfigTypes } from './types/redocly-yaml';
import { OasSpec } from './rules/common/spec';


export async function lint(opts: {
  ref: string;
  config: Config;
  externalRefResolver?: BaseResolver;
}) {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref, true)) as Document;

  return lintDocument({
    document,
    ...opts,
    externalRefResolver,
    config: opts.config.lint,
  });
}

export async function lintFromString(opts: {
  source: string;
  absoluteRef?: string;
  config: Config;
  externalRefResolver?: BaseResolver;
}) {
  const { source, absoluteRef, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = makeDocumentFromString(source, absoluteRef || '/');

  return lintDocument({
    document,
    ...opts,
    externalRefResolver,
    config: opts.config.lint,
  });
}

export async function lintDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver, config } = opts;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);
  const rules = config.getRulesForOasVersion(oasMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(
      customTypes ?? oasMajorVersion === OasMajorVersion.Version3 ? (oasVersion === OasVersion.Version3_1 ? Oas3_1Types : Oas3Types) : Oas2Types,
      oasVersion,
    ),
    config,
  );

  const ctx: WalkContext = {
    problems: [],
    oasVersion: oasVersion,
    visitorsData: {},
  };

  const preprocessors = initRules(rules as any, config, 'preprocessors', oasVersion);
  const regularRules = initRules(rules as Oas3RuleSet[], config, 'rules', oasVersion);
  const normalizedVisitors = normalizeVisitors([...preprocessors, ...regularRules] as any, types);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver
  });

  walkDocument({
    document,
    rootType: types.DefinitionRoot,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });
  return ctx.problems.map((problem) => config.addProblemToIgnore(problem));
}

export async function lintConfig(opts: {
  document: Document,
}) {
  const { document } = opts;

  const ctx: WalkContext = {
    problems: [],
    oasVersion: OasVersion.Version3_0,
    visitorsData: {},
  };
  const plugins = resolvePlugins([defaultPlugin]);
  const config = new LintConfig({
    plugins,
    rules: { spec: 'error' },
  });

  const types = normalizeTypes(ConfigTypes, config);
  const rules = [{ severity: 'error' as ProblemSeverity, ruleId: 'spec', visitor: OasSpec({ severity: 'error' }) }];
  const normalizedVisitors = normalizeVisitors(rules, types);

  walkDocument({
    document,
    rootType: types.ConfigRoot,
    normalizedVisitors,
    resolvedRefMap: new Map(),
    ctx,
  });

  return ctx.problems;
}
