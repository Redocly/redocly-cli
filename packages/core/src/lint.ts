import { rootRedoclyConfigSchema } from '@redocly/config';

import type { Config } from './config/index.js';
import { initRules } from './config/rules.js';
import { detectSpec, getMajorSpecVersion } from './detect-spec.js';
import { isGraphqlRef } from './graphql/detect-graphql.js';
import { getTypes } from './oas-types.js';
import { BaseResolver, resolveDocument, makeDocumentFromString, type Document } from './resolve.js';
import {
  SPEC_STEP_OPERATION_ID_RESOLVED_RULE_ID,
  type SpecStepOperationIdResolvedData,
} from './rules/arazzo/spec-step-operationId-resolved.js';
import { DeprecatedConfigProperties } from './rules/common/deprecated-config-properties.js';
import { NoUnresolvedRefs } from './rules/common/no-unresolved-refs.js';
import { Struct } from './rules/common/struct.js';
import { normalizeTypes, type NodeType } from './types/index.js';
import { createConfigTypes } from './types/redocly-yaml.js';
import { isPlainObject } from './utils/is-plain-object.js';
import type { CollectSpecData } from './utils/types.js';
import {
  normalizeVisitors,
  type Arazzo1Visitor,
  type Async2Visitor,
  type Async3Visitor,
  type NestedVisitObject,
  type Oas2Visitor,
  type Oas3Visitor,
  type Overlay1Visitor,
  type OpenRpc1Visitor,
  type RuleInstanceConfig,
} from './visitors.js';
import { walkDocument, type ProblemSeverity, type WalkContext } from './walk.js';

// FIXME: remove this once we remove `theme` from the schema
const { theme: _, ...propertiesWithoutTheme } = rootRedoclyConfigSchema.properties;
const redoclyConfigSchemaWithoutTheme = {
  ...rootRedoclyConfigSchema,
  properties: propertiesWithoutTheme,
};

export async function lint(opts: {
  ref: string;
  config: Config;
  externalRefResolver?: BaseResolver;
  collectSpecData?: CollectSpecData;
}) {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref, true)) as Document;
  opts.collectSpecData?.(document);

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
  const { document, customTypes, externalRefResolver, config } = opts;

  // GraphQL SDL is not a JSON/YAML tree, so it runs through a separate engine.
  if (isGraphqlRef(document.source.absoluteRef)) {
    const { lintGraphqlDocument } = await import('./graphql/lint-graphql.js');
    return lintGraphqlDocument({ document, config });
  }

  const specVersion = detectSpec(document.parsed);
  const rules = config.getRulesForSpecVersion(getMajorSpecVersion(specVersion));
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

  if (regularRules.some(({ ruleId }) => ruleId === SPEC_STEP_OPERATION_ID_RESOLVED_RULE_ID)) {
    const visitorData: SpecStepOperationIdResolvedData = {
      operationIdsBySourceUrl: await collectSourceDescriptionOperationIds({
        document,
        config,
        externalRefResolver,
      }),
    };
    ctx.visitorsData[SPEC_STEP_OPERATION_ID_RESOLVED_RULE_ID] = visitorData;
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

// Loads the OpenAPI source descriptions of an Arazzo description and collects the operation ids under their `paths`.
async function collectSourceDescriptionOperationIds(opts: {
  document: Document;
  config: Config;
  externalRefResolver: BaseResolver;
}): Promise<Map<string, Set<string>>> {
  const { document, config, externalRefResolver } = opts;
  const operationIdsBySourceUrl = new Map<string, Set<string>>();
  const sourceDescriptions =
    isPlainObject(document.parsed) && Array.isArray(document.parsed.sourceDescriptions)
      ? document.parsed.sourceDescriptions
      : [];

  await Promise.all(
    sourceDescriptions.map(async (sourceDescription: unknown) => {
      if (!isPlainObject(sourceDescription) || sourceDescription.type !== 'openapi') return;
      const { url } = sourceDescription;
      if (typeof url !== 'string') return;

      try {
        const sourceDocument = (await externalRefResolver.resolveDocument(
          document.source.absoluteRef,
          url,
          true
        )) as Document;
        const specVersion = detectSpec(sourceDocument.parsed);
        const types = normalizeTypes(
          config.extendTypes(getTypes(specVersion), specVersion),
          config
        );
        const resolvedRefMap = await resolveDocument({
          rootDocument: sourceDocument,
          rootType: types.Root,
          externalRefResolver,
        });
        const operationIds = new Set<string>();
        const visitor: Oas3Visitor | Oas2Visitor = {
          Paths: {
            Operation(operation: { operationId?: unknown }) {
              if (typeof operation.operationId === 'string') {
                operationIds.add(operation.operationId);
              }
            },
          },
        };

        walkDocument({
          document: sourceDocument,
          rootType: types.Root,
          normalizedVisitors: normalizeVisitors(
            [{ ruleId: SPEC_STEP_OPERATION_ID_RESOLVED_RULE_ID, severity: 'error', visitor }],
            types
          ),
          resolvedRefMap,
          ctx: { problems: [], specVersion, config, visitorsData: {} },
        });
        operationIdsBySourceUrl.set(url, operationIds);
      } catch {
        // the rule does not check the steps of a source description that cannot be loaded
      }
    })
  );

  return operationIdsBySourceUrl;
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
    specVersion: 'config',
    config,
    visitorsData: {},
  };

  const types = normalizeTypes(
    opts.externalConfigTypes || createConfigTypes(redoclyConfigSchemaWithoutTheme, config)
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
      | OpenRpc1Visitor
      | OpenRpc1Visitor[]
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
    {
      severity: 'warn',
      ruleId: 'configuration deprecated-properties',
      visitor: DeprecatedConfigProperties({}),
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
