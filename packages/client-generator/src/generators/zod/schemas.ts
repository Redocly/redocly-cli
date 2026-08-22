// Emits Zod schemas from the IR. Each named schema becomes an
// `export const <Name>Schema = z.<…>;` — source-text templates mirroring the
// type emitter (`ts-type.ts`) but targeting runtime validators instead of types.
// Operations with a JSON request or response body additionally land in the
// `operationSchemas` map, which powers the `zodValidation` client middleware.
//
// Only the refinement methods stable across zod 3.23 and 4 are emitted
// (`.min/.max/.int/.gt/.lt/.regex`); format helpers (`.email/.uuid/.url`) diverge
// between major versions and are deferred. Refs become `z.lazy(() => …Schema)`,
// which sidesteps declaration ordering and recursion uniformly.

import {
  allOperations,
  type ApiModel,
  type PropertyModel,
  type ScalarKind,
  type SchemaMetadata,
  type SchemaModel,
} from '../../intermediate-representation/model.js';
import { codeLiteral, pascalCase, safeIdent } from '../../printers/typescript.js';

const INDENT = '    ';

/** `<Name>Schema` — the const identifier a named schema is bound to. */
function schemaConstName(name: string): string {
  return `${pascalCase(name)}Schema`;
}

type SchemaByName = ReadonlyMap<string, SchemaModel>;

const NO_SCHEMAS: SchemaByName = new Map();

/** Map an IR schema to the Zod expression (source text) that validates it. */
export function schemaToZodExpression(
  schema: SchemaModel,
  byName: SchemaByName = NO_SCHEMAS,
  indent = ''
): string {
  return withRefinements(baseExpression(schema, byName, indent), schema);
}

function baseExpression(schema: SchemaModel, byName: SchemaByName, indent: string): string {
  switch (schema.kind) {
    case 'scalar':
      return scalarExpression(schema.scalar, schema.metadata);
    case 'object':
      return objectExpression(schema.properties, byName, indent);
    case 'array':
      return `z.array(${schemaToZodExpression(schema.items, byName, indent)})`;
    case 'record':
      return `z.record(z.string(), ${schemaToZodExpression(schema.value, byName, indent)})`;
    case 'ref':
      return `z.lazy(() => ${schemaConstName(schema.name)})`;
    case 'literal':
      return `z.literal(${codeLiteral(schema.value)})`;
    case 'enum':
      return enumExpression(schema.values);
    case 'union':
      return unionExpression(schema.members, byName, indent);
    case 'intersection':
      return schema.members
        .map((member) => schemaToZodExpression(member, byName, indent))
        .reduce((acc, next) => `${acc}.and(${next})`);
    case 'null':
      return 'z.null()';
    case 'unknown':
      return 'z.unknown()';
    case 'omit':
      return omitExpression(schema.base, schema.keys, byName, indent);
  }
}

function scalarExpression(scalar: ScalarKind, metadata?: SchemaMetadata): string {
  switch (scalar) {
    case 'string':
      // `format: binary` is typed as `Blob` (see ts-type.ts); validate it as one so the
      // zod schema agrees with the generated type instead of expecting a string.
      return metadata?.format === 'binary' ? 'z.instanceof(Blob)' : 'z.string()';
    case 'integer':
      return 'z.number().int()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
  }
}

/** A bare identifier key when valid, a quoted key otherwise. */
function propertyKeyText(name: string): string {
  return safeIdent(name) === name ? name : JSON.stringify(name);
}

/** `z.object({ <key>: <expr>(.optional() when !required), … })` — multiline when non-empty. */
function objectExpression(
  properties: PropertyModel[],
  byName: SchemaByName,
  indent: string
): string {
  if (properties.length === 0) return 'z.object({})';
  const inner = indent + INDENT;
  const lines = properties.map((property, index) => {
    const expr = schemaToZodExpression(property.schema, byName, inner);
    const value = property.required ? expr : `${expr}.optional()`;
    const comma = index === properties.length - 1 ? '' : ',';
    return `${inner}${propertyKeyText(property.name)}: ${value}${comma}`;
  });
  return `z.object({\n${lines.join('\n')}\n${indent}})`;
}

/** All-string values → `z.enum([…])`; otherwise → a union of literals. */
function enumExpression(values: Array<string | number | boolean>): string {
  if (values.every((value) => typeof value === 'string')) {
    return `z.enum([${values.map((value) => JSON.stringify(value)).join(', ')}])`;
  }
  return `z.union([${values.map((value) => `z.literal(${codeLiteral(value)})`).join(', ')}])`;
}

/** `z.union([…])`; a single member collapses to that member's expression. */
function unionExpression(members: SchemaModel[], byName: SchemaByName, indent: string): string {
  const exprs = members.map((member) => schemaToZodExpression(member, byName, indent));
  if (exprs.length === 1) return exprs[0];
  return `z.union([${exprs.join(', ')}])`;
}

/**
 * `<Base>Schema.omit({ k1: true, … })` when the base is a plain object schema.
 * `.omit` exists only on `ZodObject` — for any other base (an `allOf` intersection,
 * a union, …) the omission is distributed into the base's object members instead.
 */
function omitExpression(
  base: string,
  keys: string[],
  byName: SchemaByName,
  indent: string
): string {
  const target = byName.get(base);
  if (target && target.kind !== 'object') {
    return schemaToZodExpression(applyOmit(target, keys, byName, new Set([base])), byName, indent);
  }
  const mask = keys.map((key) => `${propertyKeyText(key)}: true`).join(', ');
  return `${schemaConstName(base)}.omit({ ${mask} })`;
}

/**
 * Remove `keys` from a schema that is not a plain object: objects drop the properties,
 * union/intersection members recurse, and a ref to an object becomes `<Ref>Schema.omit`
 * with only the keys that exist on it (zod's mask rejects unknown keys at the type
 * level). Cycles and non-object leaves return unchanged — there is nothing to omit.
 */
function applyOmit(
  schema: SchemaModel,
  keys: string[],
  byName: SchemaByName,
  seen: Set<string>
): SchemaModel {
  switch (schema.kind) {
    case 'object':
      return { ...schema, properties: schema.properties.filter((p) => !keys.includes(p.name)) };
    case 'union':
    case 'intersection':
      return {
        ...schema,
        members: schema.members.map((member) => applyOmit(member, keys, byName, seen)),
      };
    case 'ref': {
      if (seen.has(schema.name)) return schema;
      const target = byName.get(schema.name);
      if (!target) return schema;
      if (target.kind === 'object') {
        const present = keys.filter((key) =>
          target.properties.some((property) => property.name === key)
        );
        return present.length > 0 ? { kind: 'omit', base: schema.name, keys: present } : schema;
      }
      return applyOmit(target, keys, byName, new Set([...seen, schema.name]));
    }
    default:
      return schema;
  }
}

/**
 * Chain the stable-subset metadata refinements onto `expr`. Order: numeric/length
 * bounds, then `.regex` (the `.int()` for integers is already on the base).
 * `.optional()` is NOT applied here — optionality is a property-level concern
 * handled in `objectExpression`, so a top-level schema is never spuriously optional.
 */
function withRefinements(expr: string, schema: SchemaModel): string {
  const m = schema.metadata;
  if (!m) return expr;
  let out = expr;
  if (schema.kind === 'scalar' && schema.scalar === 'string') {
    if (m.minLength !== undefined) out = `${out}.min(${m.minLength})`;
    if (m.maxLength !== undefined) out = `${out}.max(${m.maxLength})`;
    if (m.pattern !== undefined) out = `${out}.regex(new RegExp(${JSON.stringify(m.pattern)}))`;
  }
  if (schema.kind === 'scalar' && (schema.scalar === 'number' || schema.scalar === 'integer')) {
    if (m.minimum !== undefined) out = `${out}.min(${m.minimum})`;
    if (m.maximum !== undefined) out = `${out}.max(${m.maximum})`;
    if (m.exclusiveMinimum !== undefined) out = `${out}.gt(${m.exclusiveMinimum})`;
    if (m.exclusiveMaximum !== undefined) out = `${out}.lt(${m.exclusiveMaximum})`;
  }
  if (schema.kind === 'array') {
    if (m.minItems !== undefined) out = `${out}.min(${m.minItems})`;
    if (m.maxItems !== undefined) out = `${out}.max(${m.maxItems})`;
  }
  return out;
}

/**
 * `<opName>: { request?: <expr>, response?: <expr> }` for every non-SSE operation with a
 * JSON request or response body — the operation's validators, keyed by the same id the
 * middleware sees at runtime (`ctx.operation.id`). SSE, binary, text, and void bodies
 * have no JSON payload to validate and are skipped.
 */
type OperationSchemaEntry = { name: string; request?: string; response?: string };

function operationSchemaEntries(model: ApiModel, byName: SchemaByName): OperationSchemaEntry[] {
  const entries: OperationSchemaEntry[] = [];
  for (const op of allOperations(model.services)) {
    if (op.sse !== undefined) continue;
    const requestBody = op.requestBody;
    const request =
      requestBody && requestBody.contentType.toLowerCase().includes('json')
        ? schemaToZodExpression(requestBody.schema, byName, INDENT)
        : undefined;
    const jsonResponse = op.successResponses.find((response) =>
      response.contentType.toLowerCase().includes('json')
    );
    const response = jsonResponse
      ? schemaToZodExpression(jsonResponse.schema, byName, INDENT)
      : undefined;
    if (!request && !response) continue;
    // The SPEC operationId — the middleware looks entries up by `ctx.operation.id`,
    // which stays the spec id even when the emitted function name was renamed.
    entries.push({ name: op.specName ?? op.name, request, response });
  }
  return entries;
}

function operationSchemasBlock(entries: OperationSchemaEntry[]): string {
  // The explicit `z.ZodType` annotation keeps the declaration-emit size proportional to
  // the operation count: the inferred type would serialize every schema's zod generics
  // and overflow tsc's limit (TS7056) on large APIs under `declaration: true`.
  const typeLines = entries.flatMap((entry) => [
    `${INDENT}${propertyKeyText(entry.name)}: {`,
    ...(entry.request ? [`${INDENT}${INDENT}request: z.ZodType;`] : []),
    ...(entry.response ? [`${INDENT}${INDENT}response: z.ZodType;`] : []),
    `${INDENT}};`,
  ]);
  const valueLines = entries.map((entry, index) => {
    const fields = [
      ...(entry.request ? [`request: ${entry.request}`] : []),
      ...(entry.response ? [`response: ${entry.response}`] : []),
    ].join(', ');
    const comma = index === entries.length - 1 ? '' : ',';
    return `${INDENT}${propertyKeyText(entry.name)}: { ${fields} }${comma}`;
  });
  return [
    '/**',
    ' * Request/response validators by operationId — powers `zodValidation`, or import one directly.',
    ' */',
    'export const operationSchemas: {',
    ...typeLines,
    '} = {',
    ...valueLines,
    '};',
  ].join('\n');
}

// The validation middleware, spliced verbatim after the schemas (matches the printer's
// double-quote/4-space style). Structurally compatible with the client's `Middleware`
// without importing it, so the zod module keeps its single `zod` dependency.
const VALIDATION_SUPPORT = `/** \`request\`/\`response\` validators for one operation (an absent side is not validated). */
export type OperationSchemaSet = { request?: z.ZodType; response?: z.ZodType };

const schemaIndex: Partial<Record<string, OperationSchemaSet>> = operationSchemas;

/** One flattened validation problem: the full nested path and a short preview of the value. */
export type ZodViolation = { path: string; message: string; received: string };

/** A request or response payload failed validation. Requests throw it; response handling is configurable. */
export class ZodValidationError extends Error {
    // Declared and assigned in the body, NOT as constructor parameter properties: those
    // need a transform, so they break \`node --experimental-strip-types\` for anything
    // importing this module (the generated CLI runs that way).
    readonly operationId: string;
    readonly direction: "request" | "response";
    readonly issues: z.ZodError["issues"];
    readonly violations: ZodViolation[];

    constructor(
        operationId: string,
        direction: "request" | "response",
        issues: z.ZodError["issues"],
        violations: ZodViolation[]
    ) {
        const detail = violations
            .slice(0, 5)
            .map((violation) => \`\${violation.path || "(root)"}: \${violation.message} (received \${violation.received})\`)
            .join("; ");
        const more = violations.length > 5 ? \`; …and \${violations.length - 5} more\` : "";
        super(\`\${direction === "request" ? "Request" : "Response"} validation failed for operation "\${operationId}": \${detail}\${more}\`);
        this.operationId = operationId;
        this.direction = direction;
        this.issues = issues;
        this.violations = violations;
        this.name = "ZodValidationError";
    }
}

// Flatten zod issues into leaf violations. Union branches (zod 3 \`unionErrors\`, zod 4
// nested \`errors\`) are recursed into, so the message names the actual failing fields
// instead of just the union root ("Invalid input").
function flattenIssues(
    issues: z.ZodError["issues"],
    value: unknown,
    base: PropertyKey[] = []
): ZodViolation[] {
    const violations: ZodViolation[] = [];
    for (const issue of issues) {
        const path = [...base, ...issue.path];
        const nested = nestedIssueLists(issue);
        if (nested.length > 0) {
            for (const sub of nested) violations.push(...flattenIssues(sub, value, path));
        } else {
            violations.push({
                path: path.map(String).join("."),
                message: issue.message,
                received: preview(valueAt(value, path)),
            });
        }
    }
    return violations;
}

/** The nested issue lists of a union-ish issue, across zod 3 (\`unionErrors\`) and zod 4 (\`errors\`). */
function nestedIssueLists(issue: unknown): Array<z.ZodError["issues"]> {
    const candidate = issue as {
        unionErrors?: Array<{ issues: z.ZodError["issues"] }>;
        errors?: Array<z.ZodError["issues"]>;
    };
    if (Array.isArray(candidate.unionErrors)) return candidate.unionErrors.map((error) => error.issues);
    if (Array.isArray(candidate.errors)) return candidate.errors;
    return [];
}

function valueAt(value: unknown, path: PropertyKey[]): unknown {
    let current = value;
    for (const key of path) {
        if (current === null || typeof current !== "object") return undefined;
        current = (current as Record<PropertyKey, unknown>)[key];
    }
    return current;
}

/** A short single-line preview of the offending value. NOTE: validation output can surface
 *  payload data — route \`onViolation\` to a scrubbed logger when responses may carry secrets. */
function preview(value: unknown): string {
    let text: string;
    try {
        text = JSON.stringify(value) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.length > 80 ? \`\${text.slice(0, 77)}…\` : text;
}

export type ZodValidationOptions = {
    /** Validate request bodies before any network call; a failure THROWS (it is the caller's own bug). Default: true. */
    request?: boolean;
    /** Replace the outgoing body with the parsed result, dropping keys the schema does not declare
     *  (for strict-DTO servers that 400 on excess properties). Runs request validation. Default: false. */
    stripRequestBodies?: boolean;
    /** Response drift handling: \`"warn"\` (default) reports via \`onViolation\` and lets the call
     *  succeed — a server drifting from its description should not crash the consumer;
     *  \`"throw"\` fails the call (even on result-mode clients); \`false\` skips response validation. */
    response?: "warn" | "throw" | false;
    /** Sink for \`"warn"\` mode. Default: \`console.warn\` with the error message. */
    onViolation?: (error: ZodValidationError) => void;
};

/**
 * Schema-validation middleware for the generated client: \`use(zodValidation())\`.
 * Request bodies are validated before any network call and throw on failure; successful
 * JSON responses are validated against the operation's response schema and WARN by
 * default (see \`ZodValidationOptions.response\`). Operations without a schema pass
 * through untouched. Payloads are never mutated unless \`stripRequestBodies\` is set.
 */
export function zodValidation(options: ZodValidationOptions = {}) {
    const { request = true, stripRequestBodies = false, response = "warn", onViolation } = options;
    const report = onViolation ?? ((error: ZodValidationError) => console.warn(error.message));
    return {
        onRequest(context: { body?: unknown; operation: { id: string } }): void {
            if ((!request && !stripRequestBodies) || context.body === undefined) return;
            const schema = schemaIndex[context.operation.id]?.request;
            if (!schema) return;
            const result = schema.safeParse(context.body);
            if (!result.success) {
                throw new ZodValidationError(
                    context.operation.id,
                    "request",
                    result.error.issues,
                    flattenIssues(result.error.issues, context.body)
                );
            }
            // zod object schemas drop undeclared keys during parsing, so the parsed value
            // IS the declared shape (intersections keep their own zod semantics).
            if (stripRequestBodies) context.body = result.data;
        },
        async onResponse(incoming: Response, context: { operation: { id: string } }): Promise<void> {
            if (response === false || !incoming.ok) return;
            const schema = schemaIndex[context.operation.id]?.response;
            if (!schema) return;
            const contentType = (incoming.headers.get("content-type") ?? "").toLowerCase();
            if (!contentType.includes("json")) return;
            const payload: unknown = await incoming.clone().json();
            const result = schema.safeParse(payload);
            if (!result.success) {
                const error = new ZodValidationError(
                    context.operation.id,
                    "response",
                    result.error.issues,
                    flattenIssues(result.error.issues, payload)
                );
                if (response === "throw") throw error;
                report(error);
            }
        },
    };
}`;

/**
 * Render the full zod module source: the component schemas, then — when any operation
 * has a JSON body — the `operationSchemas` map and the `zodValidation` middleware.
 * `''` when there is nothing to emit.
 */
export function renderZodModule(model: ApiModel): string {
  const byName: SchemaByName = new Map(model.schemas.map((named) => [named.name, named.schema]));
  const entries = operationSchemaEntries(model, byName);
  if (model.schemas.length === 0 && entries.length === 0) return '';
  const blocks = [
    'import { z } from "zod";',
    ...model.schemas.map(
      (named) =>
        `export const ${schemaConstName(named.name)} = ${schemaToZodExpression(named.schema, byName)};`
    ),
  ];
  if (entries.length === 0) return blocks.join('\n\n');
  blocks.push(operationSchemasBlock(entries));
  return `${blocks.join('\n\n')}\n${VALIDATION_SUPPORT}\n`;
}
