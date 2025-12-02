import { BaseResolver, resolveDocument, Source } from './resolve.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument } from './walk.js';
import { normalizeTypes } from './types/index.js';
import { releaseAjvInstance } from './rules/ajv.js';
import { entityNodeTypes } from './types/entity-nodes.js';
import {
  buildEntitySubjectVisitor,
  buildEntityVisitorObject,
} from './rules/entity/entity-assertions.js';

import type { Document } from './resolve.js';
import type { NormalizedProblem, ProblemSeverity, WalkContext } from './walk.js';
import type { Config } from './config/index.js';
import type { RuleConfig } from './config/types.js';
import type { Assertion } from './rules/common/assertions/index.js';
import type { RuleInstanceConfig } from './visitors.js';
import type { SpecVersion } from './oas-types.js';
import type { CatalogEntity } from './rules/entity/property-accessor.js';

/**
 * Extract entity rules from config
 * Entity rules are assertion rules (starting with 'rule/') that have entity subject types
 * Note: Rules are duplicated across spec versions, so we only check one spec version
 * and deduplicate by assertionId to be safe
 */
function getEntityRules(config: Config): Assertion[] {
  const entitySubjectTypes = ['Entity', 'EntityMetadata', 'EntityRelations', 'EntityRelation'];
  const assertionsMap = new Map<string, Assertion>();

  // Entity rules are not spec-specific, so we only need to check one spec version
  // Rules are duplicated across all spec versions, so checking one is sufficient
  const specVersions: SpecVersion[] = [
    'oas3_0',
    'oas3_1',
    'oas3_2',
    'oas2',
    'async2',
    'async3',
    'arazzo1',
    'overlay1',
  ];

  // Find the first spec version that has rules
  let rules: Record<string, RuleConfig> | undefined;
  for (const specVersion of specVersions) {
    if (config.rules[specVersion]) {
      rules = config.rules[specVersion];
      break;
    }
  }

  if (!rules) {
    return [];
  }

  // Check if there's an assertions rule
  const assertionsRule = rules.assertions;
  if (!assertionsRule || !Array.isArray(assertionsRule)) {
    return [];
  }

  for (const assertion of assertionsRule) {
    if (
      assertion &&
      typeof assertion === 'object' &&
      'subject' in assertion &&
      'type' in assertion.subject &&
      entitySubjectTypes.includes(assertion.subject.type as string) &&
      'assertionId' in assertion
    ) {
      // Deduplicate by assertionId (shouldn't be necessary with single spec version check,
      // but kept for safety in case assertionId format changes)
      const assertionId = assertion.assertionId as string;
      if (!assertionsMap.has(assertionId)) {
        assertionsMap.set(assertionId, assertion as Assertion);
      }
    }
  }

  return Array.from(assertionsMap.values());
}

/**
 * Create a Document from an entity object
 *
 * Note: entity parameter uses unknown because entities come from database
 * and can have any structure. We validate structure through the entity node types.
 */
function createEntityDocument(entity: unknown, entityKey?: string): Document {
  // Type guard to safely access entity properties
  const entityObj = entity as CatalogEntity;
  const key =
    entityKey || (typeof entityObj?.key === 'string' ? entityObj.key : undefined) || 'entity';
  const absoluteRef = `entity://${key}`;
  const source = new Source(absoluteRef, JSON.stringify(entity, null, 2), 'application/json');

  return {
    source,
    parsed: entity,
  };
}

/**
 * Lint a catalog entity against entity rules
 *
 * @param options - Linting options
 * @param options.entity - The catalog entity object (plain JavaScript object from database)
 * @param options.config - Redocly config containing entity rules
 * @param options.severity - Optional severity override (defaults to rule severity)
 * @returns Promise resolving to array of normalized problems
 *
 * @example
 * ```typescript
 * const entity = {
 *   key: 'my-service',
 *   type: 'service',
 *   title: 'My Service',
 *   metadata: { onCall: 'oncall@example.com' }
 * };
 *
 * const problems = await lintEntity({
 *   entity,
 *   config,
 * });
 * ```
 */
export async function lintEntity(opts: {
  entity: CatalogEntity | unknown;
  config: Config;
  severity?: ProblemSeverity;
  externalRefResolver?: BaseResolver;
}): Promise<NormalizedProblem[]> {
  releaseAjvInstance();

  const { entity, config, severity, externalRefResolver = new BaseResolver() } = opts;

  // Create document from entity
  const document = createEntityDocument(entity);

  // Get entity rules from config
  const entityRules = getEntityRules(config);

  if (entityRules.length === 0) {
    return [];
  }

  // Create entity types
  const types = normalizeTypes(entityNodeTypes);

  // Build visitors from entity rules
  // Note: Record<string, any> is used to match the existing visitor system pattern.
  // The visitor system uses `any` for visitor objects to support dynamic visitor structures.
  const rules: (RuleInstanceConfig & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visitor: Record<string, any>;
  })[] = [];

  for (const assertion of entityRules) {
    const ruleSeverity = severity || assertion.severity || 'error';
    if (ruleSeverity === 'off') continue;

    const subjectVisitor = buildEntitySubjectVisitor(assertion.assertionId, assertion);
    const visitorObject = buildEntityVisitorObject(assertion, subjectVisitor);

    rules.push({
      severity: ruleSeverity,
      ruleId: assertion.assertionId,
      visitor: visitorObject,
    });
  }

  // Create walk context
  const ctx: WalkContext = {
    problems: [],
    specVersion: 'oas3_0' as SpecVersion, // Use a default spec version (not used for entities)
    config,
    visitorsData: {},
  };

  // Normalize visitors
  const normalizedVisitors = normalizeVisitors(rules, types);

  // Resolve document (for entities, this is mostly a no-op but needed for the walk system)
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.EntityRoot,
    externalRefResolver,
  });

  // Walk the entity document
  // Use Entity as root type since EntityRoot is just a placeholder
  walkDocument({
    document,
    rootType: types.Entity,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  // Apply ignore patterns and return problems
  return ctx.problems.map((problem) => config.addProblemToIgnore(problem));
}
