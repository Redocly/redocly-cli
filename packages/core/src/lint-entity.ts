import { entityFileDefaultSchema, entityFileSchema } from '@redocly/config';
import { type SpecVersion } from './oas-types.js';
import {
  createEntityTypes,
  ENTITY_DISCRIMINATOR_PROPERTY_NAME,
  ENTITY_TYPES_WITH_API_SUPPORT,
} from './types/entity.js';
import { Struct } from './rules/common/struct.js';
import { NoUnresolvedRefs } from './rules/common/no-unresolved-refs.js';
import { BaseResolver, resolveDocument, makeDocumentFromString } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument } from './walk.js';
import { EntityKeyValid } from './rules/catalog-entity/entity-key-valid.js';
import { createConfig } from './config/index.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { Assertions } from './rules/common/assertions/index.js';
import {
  categorizeAssertions,
  findDataSchemaInDocument,
  transformScorecardRulesToAssertions,
} from './utils/scorecards.js';
import { isEmptyObject } from './utils/is-empty-object.js';
import { normalizeTypes } from './types/index.js';
import { lintDocument } from './lint.js';

import type { EntityFileSchema, EntityBaseFileSchema, ScorecardConfig } from '@redocly/config';
import type { Assertion } from './rules/common/assertions/index.js';
import type { NormalizedProblem, ProblemSeverity, WalkContext } from './walk.js';
import type { BaseVisitor, NestedVisitObject, RuleInstanceConfig } from './visitors.js';
import type { JSONSchema } from 'json-schema-to-ts';
import type { Config } from './config/index.js';
import type { Document } from './resolve.js';

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
    const discriminatedPropertyValue = document.parsed[ENTITY_DISCRIMINATOR_PROPERTY_NAME] as
      | string
      | undefined;

    if (!discriminatedPropertyValue) {
      rootType = types.Entity;
    } else {
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
  const entityDocument = makeDocumentFromString(JSON.stringify(entity, null, 2), 'entity');
  const discriminatorValue = (entityDocument.parsed as Record<string, unknown>)[
    ENTITY_DISCRIMINATOR_PROPERTY_NAME
  ] as string | undefined;

  const assertionConfig = transformScorecardRulesToAssertions(
    discriminatorValue || 'unknown',
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
  } else if (!isEmptyObject(apiRules)) {
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
