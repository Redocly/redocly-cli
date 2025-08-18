import { rootRedoclyConfigSchema } from '@redocly/config';
import { BaseResolver, resolveDocument, makeDocumentFromString } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument } from './walk.js';
import { initRules } from './config/rules.js';
import { normalizeTypes } from './types/index.js';
import { releaseAjvInstance } from './rules/ajv.js';
import { getMajorSpecVersion, detectSpec, getTypes } from './oas-types.js';
import { createConfigTypes } from './types/redocly-yaml.js';
import { Struct } from './rules/common/struct.js';
import { NoUnresolvedRefs } from './rules/common/no-unresolved-refs.js';
import { type Config } from './config/index.js';

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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore FIXME: remove this once we remove `theme` from the schema
delete rootRedoclyConfigSchema.properties.theme;

export async function lint(opts: {
  ref: string;
  config: Config;
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
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver, config } = opts;
  const specVersion = detectSpec(document.parsed);
  const specMajorVersion = getMajorSpecVersion(specVersion);
  const rules = config.getRulesForSpecVersion(specMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(customTypes ?? getTypes(specVersion), specVersion),
    config
  );

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
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
    specVersion: 'oas3_0', // TODO: use config-specific version
    config,
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
