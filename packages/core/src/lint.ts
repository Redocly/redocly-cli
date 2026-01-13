import {
  entityFileDefaultSchema,
  entityFileSchema,
  rootRedoclyConfigSchema,
} from '@redocly/config';
import { BaseResolver, resolveDocument, makeDocumentFromString } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument } from './walk.js';
import { initRules } from './config/rules.js';
import { normalizeTypes } from './types/index.js';
import { releaseAjvInstance } from './rules/ajv.js';
import { getTypes, type SpecVersion } from './oas-types.js';
import { detectSpec, getMajorSpecVersion } from './detect-spec.js';
import { createConfigTypes } from './types/redocly-yaml.js';
import {
  createEntityTypes,
  ENTITY_DISCRIMINATOR_NAME,
  TYPES_OF_ENTITY,
} from './types/entity-yaml.js';
import { Struct } from './rules/common/struct.js';
import { NoUnresolvedRefs } from './rules/common/no-unresolved-refs.js';
import { EntityKeyValid } from './rules/catalog-entity/entity-key-valid.js';
import {
  createConfig,
  transformScorecardRulesToAssertions,
  categorizeAssertions,
  apiRulesToConfig,
  findDataSchemaInDocument,
} from './config/index.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { Assertions } from './rules/common/assertions/index.js';

import type { CatalogEntity } from './typings/catalog-entity.js';
import type { Assertion } from './rules/common/assertions/index.js';
import type { NormalizedProblem, ProblemSeverity, WalkContext } from './walk.js';
import type { NodeType } from './types/index.js';
import type {
  Arazzo1Visitor,
  Async2Visitor,
  Async3Visitor,
  BaseVisitor,
  NestedVisitObject,
  Oas2Visitor,
  Oas3Visitor,
  Overlay1Visitor,
  OpenRpc1Visitor,
  RuleInstanceConfig,
} from './visitors.js';
import type { CollectFn } from './utils/types.js';
import type { JSONSchema } from 'json-schema-to-ts';
import type { ScorecardConfig } from '@redocly/config';
import type { Config } from './config/index.js';
import type { Plugin } from './config/types.js';
import type { Document } from './resolve.js';

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

export async function lintEntityFile(opts: {
  document: Document;
  entitySchema: JSONSchema;
  entityDefaultSchema: JSONSchema;
  severity?: ProblemSeverity;
  externalRefResolver?: BaseResolver;
  assertionConfig?: Assertion[];
}) {
  const {
    document,
    entitySchema,
    entityDefaultSchema,
    severity,
    externalRefResolver = new BaseResolver(),
    assertionConfig = {},
  } = opts;
  const ctx: WalkContext = {
    problems: [],
    specVersion: 'entity' as SpecVersion, // FIXME: this should be proper SpecVersion
    visitorsData: {},
  };

  const entityTypes = createEntityTypes(entitySchema, entityDefaultSchema);
  const types = normalizeTypes(entityTypes);

  let rootType = types.EntityFileDefault;
  if (Array.isArray(document.parsed)) {
    rootType = types.EntityFileArray;
  } else if (isPlainObject(document.parsed)) {
    const typeValue = document.parsed[ENTITY_DISCRIMINATOR_NAME];
    if (typeof typeValue === 'string' && types[typeValue]) {
      rootType = types[typeValue];
    }
  }

  // Helper to flatten rule visitors (handles both single visitor and array of visitors)
  const flattenRuleVisitors = (
    ruleId: string,
    severity: ProblemSeverity,
    visitors: BaseVisitor | BaseVisitor[]
  ): (RuleInstanceConfig & { visitor: NestedVisitObject<unknown, BaseVisitor> })[] => {
    if (Array.isArray(visitors)) {
      return visitors.map((visitor) => ({
        severity,
        ruleId,
        visitor: visitor as NestedVisitObject<unknown, BaseVisitor>,
      }));
    }
    return [
      {
        severity,
        ruleId,
        visitor: visitors as NestedVisitObject<unknown, BaseVisitor>,
      },
    ];
  };

  const rules: (RuleInstanceConfig & {
    visitor: NestedVisitObject<unknown, BaseVisitor>;
  })[] = [
    ...flattenRuleVisitors('entity struct', severity || 'error', Struct({ severity: 'error' })),
    ...flattenRuleVisitors(
      'entity no-unresolved-refs',
      severity || 'error',
      NoUnresolvedRefs({ severity: 'error' })
    ),
    ...flattenRuleVisitors(
      'entity key-valid',
      severity || 'error',
      EntityKeyValid({ severity: 'error' })
    ),
    ...flattenRuleVisitors(
      'entity assertions',
      severity || 'error',
      Assertions(assertionConfig) as BaseVisitor | BaseVisitor[]
    ),
  ];

  const normalizedVisitors = normalizeVisitors(rules, types);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType,
    externalRefResolver,
  });

  walkDocument({
    document,
    rootType,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  return ctx.problems;
}

export async function lintEntityByScorecardLevel(
  entity: CatalogEntity,
  config: NonNullable<ScorecardConfig['levels']>[number],
  document?: Document,
  plugins?: Plugin[]
): Promise<NormalizedProblem[] | void> {
  if (!config.rules) {
    throw new Error('Scorecard level rules are not defined.');
  }

  const externalRefResolver = new BaseResolver();
  const entityDocument = makeDocumentFromString(JSON.stringify(entity, null, 2), 'entity.yaml');

  const assertionConfig = transformScorecardRulesToAssertions(config.rules, plugins);
  const { entityRules, apiRules } = categorizeAssertions(assertionConfig);

  const entityProblems = await lintEntityFile({
    document: entityDocument,
    entitySchema: entityFileSchema,
    entityDefaultSchema: entityFileDefaultSchema,
    externalRefResolver,
    assertionConfig: entityRules,
  });

  if (TYPES_OF_ENTITY.includes(entity.type)) {
    if (apiRules.length === 0) {
      return entityProblems;
    }

    if (!document) {
      throw new Error('Document is required to lint API rules.');
    }

    if (entity.type === 'data-schema' && entity.metadata.schema) {
      apiRules.map((rule) => {
        if ('subject' in rule && rule.subject.type !== 'Schema') {
          throw new Error('API rules must target the Schema subject.');
        }
      });

      if (
        apiRules.some(
          (rule) =>
            'config' in rule &&
            typeof rule.config === 'object' &&
            rule.config !== null &&
            'subject' in rule.config &&
            rule.config.subject.type !== 'Schema'
        )
      ) {
        throw new Error('API rules must target the Schema subject.');
      }

      const schema = findDataSchemaInDocument(entity.title, entity.metadata.schema, document);

      if (!schema) {
        throw new Error('Failed to find the data schema in the document.');
      }

      const schemaProblems = await lintSchema({
        schema,
        schemaKey: entity.title,
        config: await createConfig({
          rules: apiRulesToConfig(apiRules),
        }),
        specType: entity.metadata.specType,
        sourceDocument: document,
        externalRefResolver,
      });

      return [...entityProblems, ...schemaProblems];
    }

    const apiProblems = await lintDocument({
      document,
      externalRefResolver,
      config: await createConfig({
        rules: apiRulesToConfig(apiRules),
      }),
    });

    return [...entityProblems, ...apiProblems];
  } else if (apiRules.length !== 0) {
    throw new Error('API rules are not supported for this entity type.');
  }

  return entityProblems;
}

export async function lintSchema(opts: {
  schema: unknown;
  schemaKey: string;
  config: Config;
  specType: string;
  sourceDocument: Document;
  externalRefResolver?: BaseResolver;
}): Promise<NormalizedProblem[]> {
  const {
    schema,
    schemaKey,
    config,
    sourceDocument,
    specType,
    externalRefResolver = new BaseResolver(config.resolve),
  } = opts;

  const parsed = sourceDocument.parsed as Record<string, unknown>;
  const specVersion = parsed[specType];
  const info = parsed.info;

  const schemaDocument = makeDocumentFromString(
    JSON.stringify(
      {
        [specType]: specVersion,
        info,
        components: {
          schemas: {
            [schemaKey]: schema,
          },
        },
      },
      null,
      2
    ),
    sourceDocument?.source.absoluteRef || `schema:${schemaKey}`
  );

  const problems = await lintDocument({
    document: schemaDocument,
    config,
    externalRefResolver,
  });

  return problems.filter((problem) =>
    problem.location.some((loc) => loc.pointer?.includes(`/components/schemas/${schemaKey}`))
  );
}
