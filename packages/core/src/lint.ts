import { rootRedoclyConfigSchema } from '@redocly/config';
import { BaseResolver, resolveDocument, makeDocumentFromString } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument } from './walk.js';
import { initRules } from './config/rules.js';
import { normalizeTypes } from './types/index.js';
import { releaseAjvInstance } from './rules/ajv.js';
import { SpecVersion, getMajorSpecVersion, detectSpec, getTypes } from './oas-types.js';
import { createConfigTypes } from './types/redocly-yaml.js';
import { Struct } from './rules/common/struct.js';
import { NoUnresolvedRefs } from './rules/no-unresolved-refs.js';
import { type Config, getGovernanceConfig } from './config/index.js';

import type { Document } from './resolve.js';
import type { ProblemSeverity, WalkContext } from './walk.js';
import type { NodeType } from './types/index.js';
import type {
  Arazzo1Visitor,
  Async2Visitor,
  Async3Visitor,
  NestedVisitObject,
  Oas2Visitor,
  Oas3Visitor,
  Overlay1Visitor,
  RuleInstanceConfig,
} from './visitors.js';
import type { CollectFn } from './utils.js';

export async function lint(opts: {
  ref: string;
  config: Config;
  alias?: string;
  externalRefResolver?: BaseResolver;
  collectSpecData?: CollectFn;
}) {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref, true)) as Document;
  opts.collectSpecData?.(document.parsed);

  return lintDocument({
    document,
    ...opts,
    externalRefResolver,
  });
}

export async function lintFromString(opts: {
  source: string;
  absoluteRef?: string;
  config: Config;
  alias?: string;
  externalRefResolver?: BaseResolver;
}) {
  const { source, absoluteRef, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = makeDocumentFromString(source, absoluteRef || '/');

  return lintDocument({
    document,
    ...opts,
    externalRefResolver,
  });
}

export async function lintDocument(opts: {
  document: Document;
  config: Config;
  alias?: string;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver, config, alias } = opts;
  const governanceConfig = getGovernanceConfig(config, alias);
  const specVersion = detectSpec(document.parsed);
  const specMajorVersion = getMajorSpecVersion(specVersion);
  const rules = governanceConfig.getRulesForSpecVersion(specMajorVersion);
  const types = normalizeTypes(
    governanceConfig.extendTypes(customTypes ?? getTypes(specVersion), specVersion),
    governanceConfig
  );

  const ctx: WalkContext = {
    problems: [],
    oasVersion: specVersion,
    visitorsData: {},
  };

  const preprocessors = initRules(rules, governanceConfig, 'preprocessors', specVersion);
  const regularRules = initRules(rules, governanceConfig, 'rules', specVersion);

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
  return ctx.problems.map((problem) => governanceConfig.addProblemToIgnore(problem));
}

export async function lintConfig(opts: {
  config: Config;
  severity?: ProblemSeverity;
  externalRefResolver?: BaseResolver;
  externalConfigTypes?: Record<string, NodeType>;
}) {
  const { severity, externalRefResolver = new BaseResolver(), config } = opts;
  if (!config.document) {
    throw new Error('Config document is not set.');
  }

  const ctx: WalkContext = {
    problems: [],
    oasVersion: SpecVersion.OAS3_0, // TODO: use config-specific version; rename `oasVersion`
    visitorsData: {},
  };

  const types = normalizeTypes(
    opts.externalConfigTypes || createConfigTypes(rootRedoclyConfigSchema, config)
  );

  const rules: (RuleInstanceConfig & {
    visitor: NestedVisitObject<
      unknown,
      | Oas3Visitor
      | Oas3Visitor[]
      | Oas2Visitor
      | Oas2Visitor[]
      | Async2Visitor
      | Async2Visitor[]
      | Async3Visitor
      | Async3Visitor[]
      | Arazzo1Visitor
      | Arazzo1Visitor[]
      | Overlay1Visitor
      | Overlay1Visitor[]
    >;
  })[] = [
    {
      severity: severity || 'error',
      ruleId: 'configuration struct',
      visitor: Struct({ severity: 'error' }),
    },
    {
      severity: severity || 'error',
      ruleId: 'configuration no-unresolved-refs',
      visitor: NoUnresolvedRefs({ severity: 'error' }),
    },
  ];
  const normalizedVisitors = normalizeVisitors(rules, types);
  const resolvedRefMap =
    config.resolvedRefMap ||
    (await resolveDocument({
      rootDocument: config.document,
      rootType: types.ConfigRoot,
      externalRefResolver,
    }));
  walkDocument({
    document: config.document,
    rootType: types.ConfigRoot,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  return ctx.problems;
}
