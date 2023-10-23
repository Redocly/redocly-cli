import { BaseResolver, resolveDocument, Document, makeDocumentFromString } from './resolve';
import { normalizeVisitors } from './visitors';
import { NodeType } from './types';
import { ProblemSeverity, WalkContext, walkDocument } from './walk';
import { StyleguideConfig, Config, initRules, defaultPlugin, resolvePlugins } from './config';
import { normalizeTypes } from './types';
import { releaseAjvInstance } from './rules/ajv';
import { SpecVersion, getMajorSpecVersion, detectSpec, getTypes } from './oas-types';
import { ConfigTypes } from './types/redocly-yaml';
import { Spec } from './rules/common/spec';

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
    config: opts.config.styleguide,
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
    config: opts.config.styleguide,
  });
}

export async function lintDocument(opts: {
  document: Document;
  config: StyleguideConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver, config } = opts;
  const specVersion = detectSpec(document.parsed);
  const specMajorVersion = getMajorSpecVersion(specVersion);
  const rules = config.getRulesForOasVersion(specMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(customTypes ?? getTypes(specVersion), specVersion),
    config
  );

  const ctx: WalkContext = {
    problems: [],
    oasVersion: specVersion,
    visitorsData: {},
  };

  const preprocessors = initRules(rules, config, 'preprocessors', specVersion);
  const regularRules = initRules(rules, config, 'rules', specVersion);

  let resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  if (preprocessors.length > 0) {
    // Make additional pass to resolve refs defined in preprocessors.
    walkDocument({
      document,
      rootType: types.Root,
      normalizedVisitors: normalizeVisitors(preprocessors, types),
      resolvedRefMap,
      ctx,
    });
    resolvedRefMap = await resolveDocument({
      rootDocument: document,
      rootType: types.Root,
      externalRefResolver,
    });
  }

  const normalizedVisitors = normalizeVisitors(regularRules, types);

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });
  return ctx.problems.map((problem) => config.addProblemToIgnore(problem));
}

export async function lintConfig(opts: { document: Document; severity?: ProblemSeverity }) {
  const { document, severity } = opts;

  const ctx: WalkContext = {
    problems: [],
    oasVersion: SpecVersion.OAS3_0,
    visitorsData: {},
  };
  const plugins = resolvePlugins([defaultPlugin]);
  const config = new StyleguideConfig({
    plugins,
    rules: { spec: 'error' },
  });

  const types = normalizeTypes(ConfigTypes, config);
  const rules = [
    {
      severity: severity || 'error',
      ruleId: 'configuration spec',
      visitor: Spec({ severity: 'error' }),
    },
  ];
  // TODO: check why any is needed
  const normalizedVisitors = normalizeVisitors(rules as any, types);

  walkDocument({
    document,
    rootType: types.ConfigRoot,
    normalizedVisitors,
    resolvedRefMap: new Map(),
    ctx,
  });

  return ctx.problems;
}
