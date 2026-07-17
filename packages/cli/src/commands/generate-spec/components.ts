import { singularize } from '@redocly/openapi-core';

import { type GeneratedDocument, type JsonSchema, mergeSchemas } from './generator.js';
import { copyObservations } from './value-inference.js';

const MIN_COMPONENT_PROPERTIES = 2;
const MIN_DISTINCT_CONTEXTS = 2;
const NEAR_DUPLICATE_SIMILARITY = 0.75;
const MAX_ENVELOPE_PROPERTIES = 2;
const NUMERIC_TYPES = new Set(['integer', 'number']);

type ShapeGroup = {
  keys: string[];
  schemas: JsonSchema[];
  merged: JsonSchema;
  contexts: Set<string>;
  primaryVotes: Map<string, number>;
  fallbackVotes: Map<string, number>;
};

type NamedGroup = {
  group: ShapeGroup;
  name: string;
};

type WalkContext = {
  container: string;
  path: string;
  primaryHints: string[];
  fallbackHints: string[];
};

const shapeKeyCache = new WeakMap<JsonSchema, string>();

/**
 * Canonical fingerprint of a schema's structure. `required` is intentionally
 * excluded so that the same shape observed with different optionality (e.g. a
 * list item vs a single resource) lands in the same group.
 */
function shapeKey(schema: JsonSchema): string {
  const cached = shapeKeyCache.get(schema);
  if (cached !== undefined) {
    return cached;
  }

  let key: string;
  if (schema.$ref !== undefined) {
    key = `ref(${schema.$ref})`;
  } else if (schema.oneOf) {
    key = `oneOf(${schema.oneOf.map(shapeKey).sort().join('|')})`;
  } else {
    const type = Array.isArray(schema.type) ? [...schema.type].sort().join(',') : schema.type;
    const parts = [`type=${type ?? ''}`];
    if (schema.properties) {
      const properties = Object.entries(schema.properties)
        .map(([name, property]) => `${JSON.stringify(name)}:${shapeKey(property)}`)
        .sort()
        .join(',');
      parts.push(`props{${properties}}`);
    }
    if (schema.additionalProperties) {
      parts.push(`values(${shapeKey(schema.additionalProperties)})`);
    }
    if (schema.items) {
      parts.push(`items(${shapeKey(schema.items)})`);
    }
    key = parts.join(';');
  }

  shapeKeyCache.set(schema, key);
  return key;
}

function isExtractionCandidate(schema: JsonSchema): boolean {
  return (
    schema.$ref === undefined &&
    schema.type === 'object' &&
    schema.oneOf === undefined &&
    schema.additionalProperties === undefined &&
    Object.keys(schema.properties ?? {}).length >= MIN_COMPONENT_PROPERTIES
  );
}

function addVotes(votes: Map<string, number>, hints: string[]): void {
  for (const hint of hints) {
    votes.set(hint, (votes.get(hint) ?? 0) + 1);
  }
}

function collectShapes(
  schema: JsonSchema,
  context: WalkContext,
  groups: Map<string, ShapeGroup>
): void {
  if (schema.oneOf) {
    schema.oneOf.forEach((member, index) =>
      collectShapes(
        member,
        { ...context, path: `${context.path}/oneOf/${index}`, fallbackHints: [] },
        groups
      )
    );
    return;
  }

  let childContainer = context.container;
  let childPathPrefix = `${context.path}/`;

  if (isExtractionCandidate(schema)) {
    const key = shapeKey(schema);
    let group = groups.get(key);
    if (!group) {
      group = {
        keys: [key],
        schemas: [],
        merged: {},
        contexts: new Set(),
        primaryVotes: new Map(),
        fallbackVotes: new Map(),
      };
      groups.set(key, group);
    }
    group.schemas.push(schema);
    group.contexts.add(`${context.container}#${context.path}`);
    addVotes(group.primaryVotes, context.primaryHints);
    addVotes(group.fallbackVotes, context.fallbackHints);
    childContainer = key;
    childPathPrefix = '';
  }

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    collectShapes(
      property,
      {
        container: childContainer,
        path: `${childPathPrefix}${name}`,
        primaryHints: [name],
        fallbackHints: [],
      },
      groups
    );
  }
  if (schema.additionalProperties) {
    collectShapes(
      schema.additionalProperties,
      {
        container: childContainer,
        path: `${childPathPrefix}additionalProperties`,
        primaryHints: context.primaryHints.map(singularize),
        fallbackHints: context.fallbackHints.map(singularize),
      },
      groups
    );
  }
  if (schema.items) {
    collectShapes(
      schema.items,
      {
        container: childContainer,
        path: `${childPathPrefix}items`,
        primaryHints: context.primaryHints.map(singularize),
        fallbackHints: context.fallbackHints.map(singularize),
      },
      groups
    );
  }
}

function lastStaticSegment(template: string): string | undefined {
  const staticSegments = template
    .split('/')
    .filter((segment) => segment && !segment.startsWith('{'));
  return staticSegments.at(-1);
}

function collectGroups(document: GeneratedDocument): Map<string, ShapeGroup> {
  const groups = new Map<string, ShapeGroup>();

  for (const [template, pathItem] of Object.entries(document.paths)) {
    const entity = lastStaticSegment(template);
    const base = entity ? singularize(entity) : undefined;

    for (const [method, operation] of Object.entries(pathItem)) {
      for (const [mime, media] of Object.entries(operation.requestBody?.content ?? {})) {
        collectShapes(
          media.schema,
          {
            container: `request ${method} ${template} ${mime}`,
            path: '',
            primaryHints: base ? [base] : [],
            fallbackHints: base ? [`${base} request`] : [],
          },
          groups
        );
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const isError = Number(status) >= 400;
        for (const [mime, media] of Object.entries(response.content ?? {})) {
          collectShapes(
            media.schema,
            {
              container: `response ${method} ${template} ${status} ${mime}`,
              path: '',
              primaryHints: isError ? ['error'] : base ? [base] : [],
              fallbackHints: isError
                ? base
                  ? [`${base} error`]
                  : []
                : base
                  ? [`${base} response`]
                  : [],
            },
            groups
          );
        }
      }
    }
  }

  return groups;
}

function propertyNames(schema: JsonSchema): string[] {
  return Object.keys(schema.properties ?? {});
}

function nameSimilarity(a: JsonSchema, b: JsonSchema): number {
  const namesA = propertyNames(a);
  const namesB = new Set(propertyNames(b));
  const shared = namesA.filter((name) => namesB.has(name)).length;
  const unionSize = namesA.length + namesB.size - shared;
  return unionSize === 0 ? 0 : shared / unionSize;
}

function scalarTypes(schema: JsonSchema): string[] | undefined {
  if (
    schema.$ref !== undefined ||
    schema.properties ||
    schema.additionalProperties ||
    schema.items ||
    schema.oneOf
  ) {
    return undefined;
  }
  const types = typeof schema.type === 'string' ? [schema.type] : schema.type;
  if (!types || types.some((type) => type === 'object' || type === 'array')) {
    return undefined;
  }
  return types;
}

function isUnconstrained(schema: JsonSchema): boolean {
  return Object.keys(schema).length === 0;
}

function compatibleProperty(a: JsonSchema, b: JsonSchema): boolean {
  if (shapeKey(a) === shapeKey(b)) {
    return true;
  }
  if (isUnconstrained(a) || isUnconstrained(b)) {
    return true;
  }
  const scalarsA = scalarTypes(a);
  const scalarsB = scalarTypes(b);
  if (scalarsA && scalarsB) {
    const typesA = new Set(scalarsA.filter((type) => type !== 'null'));
    const typesB = new Set(scalarsB.filter((type) => type !== 'null'));
    if (typesA.size === typesB.size && [...typesA].every((type) => typesB.has(type))) {
      return true;
    }
    return (
      [...typesA].every((type) => NUMERIC_TYPES.has(type)) &&
      [...typesB].every((type) => NUMERIC_TYPES.has(type))
    );
  }
  const isArrayLike = (schema: JsonSchema) => schema.type === 'array' || schema.items !== undefined;
  if (isArrayLike(a) && isArrayLike(b)) {
    return !a.items || !b.items || compatibleProperty(a.items, b.items);
  }
  return false;
}

function canUnify(a: ShapeGroup, b: ShapeGroup): boolean {
  const propertiesB = b.merged.properties ?? {};
  return Object.entries(a.merged.properties ?? {}).every(
    ([name, property]) => !(name in propertiesB) || compatibleProperty(property, propertiesB[name])
  );
}

function unifyNearDuplicates(groups: ShapeGroup[]): ShapeGroup[] {
  const result = [...groups];
  while (result.length > 1) {
    let bestA = -1;
    let bestB = -1;
    let bestScore = 0;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const score = nameSimilarity(result[i].merged, result[j].merged);
        if (
          score >= NEAR_DUPLICATE_SIMILARITY &&
          score > bestScore &&
          canUnify(result[i], result[j])
        ) {
          bestScore = score;
          bestA = i;
          bestB = j;
        }
      }
    }
    if (bestA === -1) {
      break;
    }

    const target = result[bestA];
    const source = result[bestB];
    target.keys.push(...source.keys);
    target.schemas.push(...source.schemas);
    target.merged = mergeSchemas([target.merged, source.merged]);
    for (const context of source.contexts) {
      target.contexts.add(context);
    }
    for (const [hint, votes] of source.primaryVotes) {
      target.primaryVotes.set(hint, (target.primaryVotes.get(hint) ?? 0) + votes);
    }
    for (const [hint, votes] of source.fallbackVotes) {
      target.fallbackVotes.set(hint, (target.fallbackVotes.get(hint) ?? 0) + votes);
    }
    result.splice(bestB, 1);
  }
  return result;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
}

function rankHints(votes: Map<string, number>): string[] {
  return [...votes.entries()]
    .sort(([hintA, votesA], [hintB, votesB]) => votesB - votesA || compareStrings(hintA, hintB))
    .map(([hint]) => hint);
}

function assignNames(groups: ShapeGroup[]): NamedGroup[] {
  const ordered = [...groups].sort(
    (a, b) =>
      b.contexts.size - a.contexts.size ||
      b.schemas.length - a.schemas.length ||
      compareStrings(a.keys[0], b.keys[0])
  );

  const used = new Set<string>();
  return ordered.map((group) => {
    const candidates = [...rankHints(group.primaryVotes), ...rankHints(group.fallbackVotes)]
      .map(pascalCase)
      .filter((candidate) => candidate.length > 0);
    if (candidates.length === 0) {
      candidates.push('Schema');
    }
    let name = candidates.find((candidate) => !used.has(candidate));
    for (let suffix = 2; name === undefined; suffix++) {
      const numbered = `${candidates[0]}${suffix}`;
      if (!used.has(numbered)) {
        name = numbered;
      }
    }
    used.add(name);
    return { group, name };
  });
}

function withRefs(
  schema: JsonSchema,
  refs: Map<string, string>,
  isComponentRoot = false
): JsonSchema {
  if (!isComponentRoot) {
    const name = refs.get(shapeKey(schema));
    if (name !== undefined) {
      return { $ref: `#/components/schemas/${name}` };
    }
  }

  const result: JsonSchema = { ...schema };
  copyObservations(schema, result);
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, property]) => [name, withRefs(property, refs)])
    );
  }
  if (schema.additionalProperties) {
    result.additionalProperties = withRefs(schema.additionalProperties, refs);
  }
  if (schema.items) {
    result.items = withRefs(schema.items, refs);
  }
  if (schema.oneOf) {
    result.oneOf = schema.oneOf.map((member) => withRefs(member, refs));
  }
  return result;
}

function isUnobservedListEnvelope(schema: JsonSchema): boolean {
  const properties = Object.values(schema.properties ?? {});
  const unobservedArrays = properties.filter(
    (property) => property.type === 'array' && (!property.items || isUnconstrained(property.items))
  );
  return (
    unobservedArrays.length > 0 &&
    properties.length - unobservedArrays.length <= MAX_ENVELOPE_PROPERTIES
  );
}

function hasDominantNameHint(group: ShapeGroup): boolean {
  let total = 0;
  let top = 0;
  for (const count of group.primaryVotes.values()) {
    total += count;
    top = Math.max(top, count);
  }
  return top * 2 > total;
}

/**
 * Extract object shapes that repeat across the document into named
 * `components/schemas` entries and replace every occurrence with a `$ref`.
 * Occurrences are counted per distinct context (enclosing shape + position),
 * so a shape repeated only because its parent repeats stays inline. A list
 * envelope whose payload was never observed (only empty arrays recorded, few
 * other properties) also stays inline unless its contexts agree on a name —
 * matching envelopes alone are no evidence that unrelated endpoints return
 * the same thing.
 */
export function extractSchemaComponents(document: GeneratedDocument): GeneratedDocument {
  const groups = collectGroups(document);
  for (const group of groups.values()) {
    group.merged = mergeSchemas(group.schemas);
  }

  const unified = unifyNearDuplicates([...groups.values()]);
  const extracted = unified.filter(
    (group) =>
      group.contexts.size >= MIN_DISTINCT_CONTEXTS &&
      (hasDominantNameHint(group) || !group.schemas.some(isUnobservedListEnvelope))
  );
  if (extracted.length === 0) {
    return document;
  }

  const named = assignNames(extracted);
  const refs = new Map<string, string>();
  for (const { group, name } of named) {
    for (const key of group.keys) {
      refs.set(key, name);
    }
  }

  const schemas: Record<string, JsonSchema> = {};
  for (const { group, name } of [...named].sort((a, b) => compareStrings(a.name, b.name))) {
    schemas[name] = withRefs(group.merged, refs, true);
  }

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      for (const media of Object.values(operation.requestBody?.content ?? {})) {
        media.schema = withRefs(media.schema, refs);
      }
      for (const response of Object.values(operation.responses)) {
        for (const media of Object.values(response.content ?? {})) {
          media.schema = withRefs(media.schema, refs);
        }
      }
    }
  }

  document.components = { schemas };
  return document;
}
