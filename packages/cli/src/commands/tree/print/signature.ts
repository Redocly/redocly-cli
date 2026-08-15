import {
  classifyRef,
  isPlainObject,
  parseYaml,
  truncateSummary,
  type ApiNodeEnvelope,
  type ApiNodeRef,
  type TypedRef,
} from '@redocly/openapi-core';

const SCHEMA_SECTION = 'schemas';
const MAX_ENUM_VALUES = 6;

/** A dependency projected for `ai`: coordinates plus a compact signature instead of raw YAML. */
export type AiDepEntry = {
  id: string;
  file: string;
  start_line: number;
  end_line: number;
  signature: string;
};

export type AiDepsClosure = {
  deps: AiDepEntry[];
  deeper: string[];
};

/**
 * Projects a `--with-deps` closure for the `ai` format: dependencies at BFS depth 1-2 from the
 * selection get a compact signature instead of raw YAML; anything deeper is listed as a bare id
 * under `deeper`, so the caller fetches only the branch it decides it needs (see the "Depth"
 * section of the design). `seedRefs` are the selection's own one-hop typed refs (already computed
 * for `refs`), which double as the depth-1 frontier; depth 2 is each depth-1 dependency's own refs.
 *
 * Depth is derived here instead of in `appendDepsClosure` because every dependency it collects is
 * already fetched — the only thing missing is which BFS level each one landed on, and that's
 * recoverable from data the CLI already has: the selection's typed `refs`, and each dependency's
 * own (untyped) `refs`, classified the same way core classifies the selection's.
 */
export function buildAiDepsClosure(deps: ApiNodeEnvelope[], seedRefs: TypedRef[]): AiDepsClosure {
  const depsById = new Map(deps.map((dep) => [dep.id, dep]));
  const nearIds = computeNearDepthIds(deps, depsById, seedRefs);

  const near: AiDepEntry[] = [];
  const deeper: string[] = [];
  for (const dep of deps) {
    if (!nearIds.has(dep.id)) {
      deeper.push(dep.id);
      continue;
    }
    near.push({
      id: dep.id,
      file: dep.file,
      start_line: dep.start_line,
      end_line: dep.end_line,
      signature: buildNodeSignature(dep.id.slice(0, dep.id.indexOf('/')), dep.content, dep.refs),
    });
  }

  return { deps: near, deeper };
}

/**
 * Depth 1 is the selection's own typed refs that landed in the closure; depth 2 is those
 * dependencies' own refs, classified the same way `refs`/`usedBy` type any other ref. Anything
 * not reached by then stays out of the result, regardless of its true graph distance — the format
 * only distinguishes "near" (1-2 hops) from "deeper" (everything else).
 *
 * For a webhook operation, `seedRefs` are the one operation's own refs, while core seeds the
 * closure from the container node all of that webhook's methods share (see `buildOperationCard`).
 * A dependency reachable only from a sibling method — never from this operation and never from
 * another depth-1 dependency — is undercounted as "deeper" instead of depth 1; narrow, and the
 * same operation-vs-container split already exists for `refs` vs `deps` in every other format.
 */
function computeNearDepthIds(
  deps: ApiNodeEnvelope[],
  depsById: Map<string, ApiNodeEnvelope>,
  seedRefs: TypedRef[]
): Set<string> {
  const near = new Set<string>();
  for (const ref of seedRefs) {
    const id = componentId(ref);
    if (id !== undefined && depsById.has(id)) near.add(id);
  }

  for (const id of [...near]) {
    for (const targetId of depRefTargetIds(depsById.get(id)!)) {
      if (depsById.has(targetId)) near.add(targetId);
    }
  }

  return near;
}

function componentId(ref: { component?: string; name?: string }): string | undefined {
  if (ref.component === undefined || ref.component === 'unknown' || ref.name === undefined) {
    return undefined;
  }
  return `${ref.component}/${ref.name}`;
}

function depRefTargetIds(dep: ApiNodeEnvelope): string[] {
  return dep.refs
    .map((ref) => componentId(classifyRef(ref)))
    .filter((id): id is string => id !== undefined);
}

/** Builds the signature for one node's raw content: schema signatures for `schemas`, one-line summaries otherwise. */
export function buildNodeSignature(section: string, content: string, refs: ApiNodeRef[]): string {
  const parsed = parseNodeContent(content);
  const refIndex = new Map(refs.map((ref) => [ref.ref, ref]));
  return section === SCHEMA_SECTION
    ? buildSchemaSignature(parsed, refIndex)
    : buildSummarySignature(parsed, refIndex);
}

/**
 * A node's `content` — a dependency's, for its signature, or a card's own, for its `ai` body — is
 * raw source sliced by line range, and that range's last line is actually the start of the next
 * sibling key (a quirk of how the range is computed) — so the slice is one line short of being
 * valid YAML on its own. Drop trailing lines that dedent below the block's own first line before
 * parsing, then give up cleanly if it's still unparsable.
 */
export function parseNodeContent(content: string): Record<string, unknown> | undefined {
  const lines = content.split('\n');
  const firstContentLine = lines.find((line) => line.trim().length > 0);
  if (firstContentLine === undefined) return undefined;
  const baseIndent = firstContentLine.match(/^ */)![0].length;

  let end = lines.length;
  while (end > 0) {
    const line = lines[end - 1];
    const indent = line.match(/^ */)![0].length;
    if (line.trim() !== '' && indent >= baseIndent) break;
    end--;
  }

  try {
    const parsed = parseYaml(lines.slice(0, end).join('\n'));
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Non-schema dependencies (responses, parameters, examples, headers, ...) carry no property list. */
function buildSummarySignature(
  parsed: Record<string, unknown> | undefined,
  refIndex: Map<string, ApiNodeRef>
): string {
  if (parsed === undefined) return '';
  if (typeof parsed.$ref === 'string') return `→${resolveRefName(parsed.$ref, refIndex)}`;
  const summary = typeof parsed.summary === 'string' ? parsed.summary : undefined;
  const description = typeof parsed.description === 'string' ? parsed.description : undefined;
  return truncateSummary(summary ?? description) ?? '';
}

type FlattenedSchema = {
  properties: Record<string, unknown>;
  required: Set<string>;
  anyOf?: string[];
  oneOf?: string[];
  allOf?: string[];
  discriminator?: string;
};

function buildSchemaSignature(
  parsed: Record<string, unknown> | undefined,
  refIndex: Map<string, ApiNodeRef>
): string {
  if (parsed === undefined) return '';
  const flattened: FlattenedSchema = { properties: {}, required: new Set() };
  flattenSchema(parsed, flattened, refIndex);

  const propertyList = Object.keys(flattened.properties)
    .map((name) => renderProperty(name, flattened.properties[name], flattened.required, refIndex))
    .join(', ');
  const header = renderHeader(flattened);

  if (header && propertyList) return `${header}: ${propertyList}`;
  if (header) return header;
  if (propertyList) return propertyList;
  // No properties and no composition: a bare typed schema (e.g. a `string` alias with no
  // properties of its own, or an object with none declared). Fall back to its own type/enum,
  // the same rule a property's type gets.
  return typeAndEnumSuffix(parsed);
}

/**
 * Merges `allOf` members into one property list (a ref member can't be merged — it's named in the
 * header instead, same as an `anyOf`/`oneOf` member) and hoists any composition keyword an inline
 * member carries up to this schema's own header, so a schema wrapped in `allOf` for style reasons
 * still reads as one flat shape.
 */
function flattenSchema(
  schema: unknown,
  acc: FlattenedSchema,
  refIndex: Map<string, ApiNodeRef>
): void {
  if (!isPlainObject(schema)) return;

  if (Array.isArray(schema.allOf)) {
    for (const member of schema.allOf) {
      if (isPlainObject(member) && typeof member.$ref === 'string') {
        acc.allOf = [...(acc.allOf ?? []), resolveRefName(member.$ref, refIndex)];
      } else {
        flattenSchema(member, acc, refIndex);
      }
    }
  }

  if (isPlainObject(schema.properties)) Object.assign(acc.properties, schema.properties);
  if (Array.isArray(schema.required)) {
    for (const name of schema.required) if (typeof name === 'string') acc.required.add(name);
  }
  if (Array.isArray(schema.anyOf)) {
    acc.anyOf = schema.anyOf.map((member) => resolveComposedMemberName(member, refIndex));
  }
  if (Array.isArray(schema.oneOf)) {
    acc.oneOf = schema.oneOf.map((member) => resolveComposedMemberName(member, refIndex));
  }
  const discriminatorProperty = isPlainObject(schema.discriminator)
    ? schema.discriminator.propertyName
    : undefined;
  if (typeof discriminatorProperty === 'string') acc.discriminator = discriminatorProperty;
}

/** An `anyOf`/`oneOf`/`allOf` member is only ever named in the header, never merged or inlined. */
function resolveComposedMemberName(member: unknown, refIndex: Map<string, ApiNodeRef>): string {
  if (!isPlainObject(member)) return 'inline';
  if (typeof member.$ref === 'string') return resolveRefName(member.$ref, refIndex);
  return typeAndEnumSuffix(member) || 'inline';
}

function renderHeader(flattened: FlattenedSchema): string {
  const segments: string[] = [];
  if (flattened.anyOf) segments.push(`anyOf: ${flattened.anyOf.join(', ')}`);
  if (flattened.oneOf) segments.push(`oneOf: ${flattened.oneOf.join(', ')}`);
  if (flattened.allOf) segments.push(`allOf: ${flattened.allOf.join(', ')}`);
  if (flattened.discriminator) segments.push(`discriminator: ${flattened.discriminator}`);
  return segments.length > 0 ? `[${segments.join(', ')}]` : '';
}

function renderProperty(
  name: string,
  propertySchema: unknown,
  required: Set<string>,
  refIndex: Map<string, ApiNodeRef>
): string {
  const marker = required.has(name) ? '*' : '';
  if (isPlainObject(propertySchema) && typeof propertySchema.$ref === 'string') {
    return `${name}${marker}→${resolveRefName(propertySchema.$ref, refIndex)}`;
  }
  if (!isPlainObject(propertySchema)) return `${name}${marker}`;
  const typeAndEnum = typeAndEnumSuffix(propertySchema);
  return `${name}${marker}${typeAndEnum ? `:${typeAndEnum}` : ''}`;
}

/** `type` (a type array renders `a|b`) plus `=`-joined enum values, capped at `MAX_ENUM_VALUES`. */
function typeAndEnumSuffix(schema: Record<string, unknown>): string {
  const type = Array.isArray(schema.type)
    ? schema.type.join('|')
    : typeof schema.type === 'string'
      ? schema.type
      : undefined;
  const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined;
  const enumSuffix =
    enumValues === undefined
      ? ''
      : `=${enumValues.slice(0, MAX_ENUM_VALUES).map(String).join('|')}${
          enumValues.length > MAX_ENUM_VALUES ? '…' : ''
        }`;
  return `${type ?? ''}${enumSuffix}`;
}

/** Bare name of a `$ref` target: the classified component name, or a filename-derived fallback. */
function resolveRefName(refString: string, refIndex: Map<string, ApiNodeRef>): string {
  const resolved = refIndex.get(refString);
  if (resolved) {
    const typed = classifyRef(resolved);
    if (typed.component !== 'unknown' && typed.name !== undefined) return typed.name;
  }
  return fallbackRefName(refString);
}

/** Used only when a ref can't be classified (e.g. unresolved) — last path segment, no extension. */
function fallbackRefName(refString: string): string {
  const [path, fragment] = refString.split('#');
  const source = fragment && fragment !== '/' ? fragment : path;
  const segments = source.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return last ? last.replace(/\.(yaml|yml|json)$/i, '') : refString;
}
