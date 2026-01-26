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
  ENTITY_DISCRIMINATOR_PROPERTY_NAME,
  ENTITY_TYPES_WITH_API_SUPPORT,
} from './types/entity-yaml.js';
import { Struct } from './rules/common/struct.js';
import { NoUnresolvedRefs } from './rules/common/no-unresolved-refs.js';
import { EntityKeyValid } from './rules/catalog-entity/entity-key-valid.js';
import { createConfig } from './config/index.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { Assertions } from './rules/common/assertions/index.js';
import {
  categorizeAssertions,
  findDataSchemaInDocument,
  transformScorecardRulesToAssertions,
} from './utils/scorecards.js';

import type { EntityFileSchema, EntityBaseFileSchema, ScorecardConfig } from '@redocly/config';
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
import type { Config } from './config/index.js';
import type { Document } from './resolve.js';

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
  assertionConfig?: Record<string, Assertion>;
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

  const { entityTypes, discriminatorResolver } = createEntityTypes(
    entitySchema,
    entityDefaultSchema
  );

  const types = normalizeTypes(entityTypes);

  let rootType = types.Entity;
  if (Array.isArray(document.parsed)) {
    rootType = types.EntityFileArray;
  } else if (isPlainObject(document.parsed)) {
    const discriminatedPropertyValue = document.parsed[
      ENTITY_DISCRIMINATOR_PROPERTY_NAME
    ] as string;
    const discriminatedTypeName = discriminatorResolver?.(
      document.parsed,
      discriminatedPropertyValue
    );
    if (
      discriminatedTypeName &&
      typeof discriminatedTypeName === 'string' &&
      types[discriminatedTypeName as string]
    ) {
      rootType = types[discriminatedTypeName as string];
    }
  }

  const assertionVisitors = Assertions(assertionConfig);
  const flattenedAssertions = Array.isArray(assertionVisitors)
    ? assertionVisitors.map((visitor) => ({
        severity: severity || 'error',
        ruleId: 'entity assertions',
        visitor: visitor as NestedVisitObject<unknown, BaseVisitor>,
      }))
    : [
        {
          severity: severity || 'error',
          ruleId: 'entity assertions',
          visitor: assertionVisitors as NestedVisitObject<unknown, BaseVisitor>,
        },
      ];

  const rules: (RuleInstanceConfig & {
    visitor: NestedVisitObject<unknown, BaseVisitor | BaseVisitor[]>;
  })[] = [
    {
      severity: severity || 'error',
      ruleId: 'entity struct',
      visitor: Struct({ severity: 'error' }),
    },
    {
      severity: severity || 'error',
      ruleId: 'entity no-unresolved-refs',
      visitor: NoUnresolvedRefs({ severity: 'error' }),
    },
    {
      severity: severity || 'error',
      ruleId: 'entity key-valid',
      visitor: EntityKeyValid({ severity: 'error' }),
    },
    ...flattenedAssertions,
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

export async function lintEntityWithScorecardLevel(
  entity: EntityFileSchema | EntityBaseFileSchema,
  scorecardLevel: NonNullable<ScorecardConfig['levels']>[number],
  document?: Document
): Promise<NormalizedProblem[]> {
  if (!scorecardLevel.rules) {
    throw new Error(`Scorecard level "${scorecardLevel.name}" has no rules defined.`);
  }

  const externalRefResolver = new BaseResolver();
  const entityDocument = makeDocumentFromString(JSON.stringify(entity, null, 2), 'entity.yaml');

  const assertionConfig = transformScorecardRulesToAssertions(
    (entityDocument.parsed as Record<string, unknown>)[
      ENTITY_DISCRIMINATOR_PROPERTY_NAME
    ] as string,
    scorecardLevel.rules
  );
  const { entityRules, apiRules } = categorizeAssertions(assertionConfig);

  const entityProblems = await lintEntityFile({
    document: entityDocument,
    entitySchema: entityFileSchema,
    entityDefaultSchema: entityFileDefaultSchema,
    externalRefResolver,
    assertionConfig: entityRules,
  });

  if (ENTITY_TYPES_WITH_API_SUPPORT.includes(entity.type)) {
    if (Object.keys(apiRules).length === 0) {
      return entityProblems;
    }

    if (!document) {
      throw new Error(
        `Document is required for entity type "${entity.type}". Provide the source API document to lint API rules.`
      );
    }

    if (entity.type === 'data-schema' && entity.metadata?.schema) {
      Object.values(apiRules).forEach((rule) => {
        if (typeof rule === 'object' && rule.subject.type !== 'Schema') {
          throw new Error(
            `API rules for "data-schema" entity must target Schema subject, but found "${rule.subject.type}".`
          );
        }
      });

      const schema = findDataSchemaInDocument(
        entity.title,
        entity.metadata.schema as string,
        document
      );

      if (!schema) {
        throw new Error(
          `Schema "${entity.title}" not found in the document. Ensure the schema exists in components.schemas.`
        );
      }

      const schemaProblems = await lintSchema({
        schema,
        schemaKey: entity.title,
        config: await createConfig({
          rules: apiRules,
        }),
        specType: entity.metadata.specType as string,
        sourceDocument: document,
        externalRefResolver,
      });

      return [...entityProblems, ...schemaProblems];
    }

    const apiProblems = await lintDocument({
      document,
      externalRefResolver,
      config: await createConfig({
        rules: apiRules,
      }),
    });

    return [...entityProblems, ...apiProblems];
  } else if (Object.keys(apiRules).length !== 0) {
    throw new Error(
      `API rules are not supported for entity type "${
        entity.type
      }". Only ${ENTITY_TYPES_WITH_API_SUPPORT.join(', ')} support API rules.`
    );
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
