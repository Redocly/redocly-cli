import Ajv2020, { type ErrorObject, type ValidateFunction } from '@redocly/ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import { readFileSync } from 'node:fs';

import { REALM_FRONT_MATTER_SCHEMA } from '../../data/realm-front-matter-schema.js';
import { filterByTypes } from '../../parser/index.js';
import type { Token } from '../../parser/types.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { TokenRule } from '../types.js';
import { fileMatchesAnyPattern } from '../utils.js';

// Built-in schemas selectable by name, so a project gets one without
// vendoring a copy that goes stale. Same shape as `markdoc: { schema:
// realm }`, which names its built-in the same way.
const BUILT_IN_SCHEMAS: Record<string, Record<string, unknown>> = {
  realm: REALM_FRONT_MATTER_SCHEMA,
};

// CJS/ESM interop: the ajv build exports the constructor as `default`.
const AjvConstructor = (Ajv2020 as unknown as { default?: typeof Ajv2020 }).default ?? Ajv2020;

type SchemaMapping = {
  files?: string[];
  // An inline schema object, or the name of a built-in one (`realm`).
  schema?: Record<string, unknown> | string;
  schemaFile?: string;
  // Reject keys the schema does not define. Off by default: pages carry
  // project data that Markdoc templates read back through `$frontmatter`.
  strict?: boolean;
};

type ValidatorEntry = { validate: ValidateFunction } | { failure: string };
const validatorCache = new WeakMap<object, ValidatorEntry>();

// A schema that cannot load or compile must fail at the RULE's severity on
// every matching file -- a thrown error would surface as an internal
// warning, and warnings do not fail the run.
function validatorFor(mapping: SchemaMapping): ValidatorEntry {
  const cached = validatorCache.get(mapping);
  if (cached) return cached;

  const entry = buildValidator(mapping);
  validatorCache.set(mapping, entry);
  return entry;
}

function buildValidator(mapping: SchemaMapping): ValidatorEntry {
  let schema: Record<string, unknown> | string | undefined = mapping.schema;
  if (typeof schema === 'string') {
    const builtIn = BUILT_IN_SCHEMAS[schema];
    if (!builtIn) {
      return {
        failure: `unknown built-in schema "${schema}" (available: ${Object.keys(BUILT_IN_SCHEMAS).join(', ')})`,
      };
    }
    schema = builtIn;
  }
  if (schema === undefined && typeof mapping.schemaFile === 'string') {
    let raw: string;
    try {
      raw = readFileSync(mapping.schemaFile, 'utf8');
    } catch (error) {
      return {
        failure: `cannot read schemaFile "${mapping.schemaFile}" (${error instanceof Error ? error.message : String(error)})`,
      };
    }
    try {
      schema = yaml.load(raw, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>;
    } catch (error) {
      return {
        failure: `schemaFile "${mapping.schemaFile}" is not valid YAML (${error instanceof Error ? error.message.split('\n')[0] : String(error)})`,
      };
    }
  }
  if (!isPlainObject(schema)) {
    return {
      failure:
        'each schemas entry needs a `schema` object, a built-in schema name, or a `schemaFile` path',
    };
  }

  // `strict` closes the schema without the author restating its
  // properties. An explicit `additionalProperties` in the schema itself
  // stays authoritative.
  const compiled =
    mapping.strict === true && !('additionalProperties' in schema)
      ? { ...schema, additionalProperties: false }
      : schema;

  const ajv = new (AjvConstructor as any)({ allErrors: true, strict: false });
  (addFormats as any)(ajv); // mismatching AJV typing due to fork
  try {
    return { validate: ajv.compile(compiled) };
  } catch (error) {
    return {
      failure: `schema does not compile (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}

// A value that fails every branch of `anyOf`/`oneOf` produces one error per
// branch plus the summary error, so one wrong value would report three
// times. Keep the summary and drop the branch errors at the same path.
function collapseBranchErrors(errors: ErrorObject[]): ErrorObject[] {
  const branchPaths = new Set(
    errors
      .filter((error) => error.keyword === 'anyOf' || error.keyword === 'oneOf')
      .map((error) => error.instancePath)
  );
  if (branchPaths.size === 0) return errors;
  return errors.filter(
    (error) =>
      error.keyword === 'anyOf' || error.keyword === 'oneOf' || !branchPaths.has(error.instancePath)
  );
}

// JSON pointer unescape: `~1` is `/` and `~0` is `~`.
function pointerSegments(instancePath: string): string[] {
  if (instancePath === '') return [];
  return instancePath
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

// The front matter line that opens the error's top-level key, so a nested
// error still points at a real line. Keys may be quoted in the source.
function lineForKey(key: string, valueLines: Token[], blockStartLine: number): number {
  const candidates = [`${key}:`, `'${key}':`, `"${key}":`];
  for (const line of valueLines) {
    const text = line.text;
    if (candidates.some((candidate) => text.startsWith(candidate))) return line.startLine;
  }
  return blockStartLine;
}

export const frontMatter: TokenRule = {
  name: 'front-matter',
  tags: ['structure'],
  fixable: false,
  defaults: {
    message: 'Front matter: %s',
    schemas: [],
  },
  check(ctx) {
    const schemas = (ctx.config.schemas ?? []) as SchemaMapping[];
    if (!Array.isArray(schemas) || schemas.length === 0) return;

    const mapping = schemas.find(
      (entry) => Array.isArray(entry.files) && fileMatchesAnyPattern(ctx.filePath, entry.files)
    );
    if (!mapping) return;
    const entry = validatorFor(mapping);
    if ('failure' in entry) {
      ctx.onError({ line: 1, context: entry.failure });
      return;
    }
    const validate = entry.validate;

    const block = filterByTypes(ctx.tree, ['yaml'])[0];
    const blockStartLine = block?.startLine ?? 1;
    const valueLines = block?.children.filter((child) => child.type === 'yamlValue') ?? [];

    let data: unknown = {};
    if (block) {
      const source = valueLines.map((line) => line.text).join('\n');
      try {
        // CORE_SCHEMA keeps timestamps as strings, which is what JSON Schema sees.
        data = yaml.load(source, { schema: yaml.CORE_SCHEMA }) ?? {};
      } catch (error) {
        ctx.onError({
          line: blockStartLine,
          context: `not valid YAML (${error instanceof Error ? error.message.split('\n')[0] : String(error)})`,
        });
        return;
      }
    }

    if (validate(data)) return;
    for (const error of collapseBranchErrors(validate.errors ?? [])) {
      const segments = pointerSegments(error.instancePath);
      // additionalProperties errors sit on the object; the offending key is
      // in params, and that key's line is the useful one.
      const extraKey =
        error.keyword === 'additionalProperties'
          ? (error.params as { additionalProperty?: string }).additionalProperty
          : undefined;
      const keyForLine = extraKey ?? segments[0];
      const line =
        keyForLine === undefined
          ? blockStartLine
          : lineForKey(keyForLine, valueLines, blockStartLine);
      const at =
        segments.length === 0
          ? extraKey === undefined
            ? 'front matter'
            : `'${extraKey}'`
          : `'${segments.join('.')}'`;
      const message =
        extraKey === undefined
          ? (error.message ?? 'does not match the schema')
          : 'is not an allowed property';
      ctx.onError({ line, context: `${at} ${message}` });
    }
  },
};
