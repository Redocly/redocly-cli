// Emits a `*.mocks.ts` module: a `create<Schema>(overrides?)` data factory per
// named schema, an `<op>Handler(override?)` MSW request handler per operation
// (its primary success response), and an aggregated `handlers` array. Response
// data is sampled at codegen time (`sampleValue`) and printed as TypeScript
// literals — source-text templates — so the generated module depends only on
// `msw`; the real client stays zero-dependency.

import {
  allOperations,
  type ApiModel,
  type DateType,
  type NamedSchemaModel,
  type OperationModel,
  type ResponseBodyModel,
  type SchemaModel,
} from '@redocly/client-generator';
import {
  codeLiteral,
  isIdentifier,
  pascalCase,
} from '@redocly/client-generator/printers/typescript';
import { isPlainObject } from '@redocly/openapi-core';

import { fakerExpression } from './faker.ts';
import { sampleValue, SampleExpression } from './sample.ts';
import {
  expr,
  isObjectValue,
  type MockValue,
  objectValue,
  renderMockValue,
  spreadInto,
} from './values.ts';

const INDENT = '    ';

export type MockOptions = {
  /** Import specifier for the sdk entry the schema types live in. */
  sdkModule: string;
  /** Must match the sdk's `--date-type`: under `'Date'` the sampler bakes date
   *  fields as `new Date(...)` so the mock data matches the `Date`-typed sdk. */
  dateType?: DateType;
  /**
   * How factory/handler bodies produce data. `'static'` (default) inlines deterministic
   * literals from the sampler (zero-dep, contract-faithful). `'faker'` emits
   * `@faker-js/faker` calls for realistic data — reproducible when `mockSeed` is set —
   * making `@faker-js/faker` the consumer's dev-dep. Factory signatures are identical
   * across modes, so a consumer can flip this without changing call sites.
   */
  mockData?: 'static' | 'faker';
  /** When set in `'faker'` mode, emit a top-level `faker.seed(<n>);` so runs reproduce. */
  mockSeed?: number;
};

/** The body value for `schema` under the active data mode: a static literal tree
 *  (`'static'`) or a tree of `@faker-js/faker` calls (`'faker'`). Both honor `dateType`
 *  and the binary/Blob type demand; the faker path inlines refs with the same cycle
 *  guard as the static sampler, so neither recurses forever on a cyclic schema. */
function bodyValue(schema: SchemaModel, model: ApiModel, opts: MockOptions): MockValue {
  return opts.mockData === 'faker'
    ? fakerExpression(schema, model.schemas, { dateType: opts.dateType })
    : literal(sampleValue(schema, model.schemas, { dateType: opts.dateType }));
}

/** Render the full `*.mocks.ts` source. `''` when the model has no operations. */
export function renderMockModule(model: ApiModel, opts: MockOptions): string {
  const operations = allOperations(model.services);
  if (operations.length === 0) return '';
  const blocks = [
    ...schemaTypeImport(model, opts),
    // Faker mode imports `faker` (the consumer's dev-dep) and, with a seed, pins it once
    // at module top so every run reproduces. Static mode emits neither (stays zero-dep).
    ...(opts.mockData === 'faker' && opts.mockSeed !== undefined
      ? [`faker.seed(${opts.mockSeed});`]
      : []),
    ...model.schemas.map((s) => factoryFor(s, model, opts)),
    ...operations.flatMap((op) => [
      handlerFor(op, model, opts),
      ...(op.errorResponses.length > 0 ? [errorHandlerFor(op, model, opts)] : []),
    ]),
    handlersArray(operations),
  ];
  const fakerImport = opts.mockData === 'faker' ? "import { faker } from '@faker-js/faker';\n" : '';
  return `import { http, HttpResponse } from 'msw';\n${fakerImport}\n${blocks.join('\n\n')}`;
}

/**
 * `import type { A, B, … } from '<sdkModule>';` — the named-schema types the factories
 * reference (`create<Pascal>` returns/accepts `<Pascal>`). Sorted for stable output.
 * Empty when the model has no named schemas (so no type import is emitted). Importing
 * the schema types also shadows globals of the same name (e.g. an `Error` schema) so the
 * factory return types resolve to the generated type, not `globalThis.Error`.
 */
function schemaTypeImport(model: ApiModel, opts: MockOptions): string[] {
  if (model.schemas.length === 0) return [];
  // Verbatim, not PascalCased: the sdk exports each schema type under its emitted name
  // (`pet` stays `pet`), and the import must match it exactly.
  const names = model.schemas.map((s) => s.name).sort();
  return [`import type { ${names.join(', ')} } from ${JSON.stringify(opts.sdkModule)};`];
}

/**
 * `export function create<Pascal>(overrides?: Partial<Name>): Name { return { …sampled, ...overrides }; }`.
 * A schema whose sample is not an object literal (a scalar, enum, date, …) has nothing
 * to spread into — `Partial<string>` is meaningless and would silently drop the argument —
 * so its factory takes the FULL type and returns the override wholesale (`overrides ?? sample`).
 */
function factoryFor(named: NamedSchemaModel, model: ApiModel, opts: MockOptions): string {
  const pascal = pascalCase(named.name);
  const sampled = bodyValue(named.schema, model, opts);
  // Type references use the sdk's verbatim export name; only the factory NAME is PascalCased.
  const typeName = named.name;
  const spreads = isObjectValue(sampled);
  // Spreading `Partial<Union>` (the override type of a union schema) distributes into
  // `Partial<A> | Partial<B>`, which widens any discriminant property (e.g. `category`)
  // and defeats narrowing — TS can no longer place the literal in a single union member.
  // The sampled object is already a complete, correct member, so re-assert the type.
  const rendered = renderMockValue(spreads ? spreadInto(sampled, 'overrides') : sampled, INDENT);
  const body = !spreads
    ? `overrides ?? ${rendered}`
    : named.schema.kind === 'union'
      ? `${rendered} as ${typeName}`
      : rendered;
  const overridesType = spreads ? `Partial<${typeName}>` : typeName;
  return [
    `export function create${pascal}(overrides?: ${overridesType}): ${typeName} {`,
    `${INDENT}return ${body};`,
    '}',
  ].join('\n');
}

/**
 * The interpolation gate for values that land in emitted CODE positions (binding
 * names, `http.<method>` member access). The pipeline sanitizes operation names
 * before any emitter runs; this re-checks at the construction site so a hostile
 * name can never become code even if that invariant regresses.
 */
function codeIdent(value: string): string {
  if (!isIdentifier(value)) {
    throw new Error(`Unsafe identifier in mock emission: ${JSON.stringify(value)}`);
  }
  return value;
}

/** `export const <op>Handler = (override?: <OverrideType>) => http.<method>('<path>', () => <response>);`. */
function handlerFor(op: OperationModel, model: ApiModel, opts: MockOptions): string {
  const override = overrideParam(op, model, opts);
  const params = override ?? '';
  const call = `http.${codeIdent(op.method)}(${JSON.stringify(mswPath(op.path))}, () => ${responseExpression(op, model, opts)})`;
  return `export const ${codeIdent(op.name)}Handler = (${params}) => ${call};`;
}

/**
 * `export const <op>ErrorHandler = (status: <StatusUnion>, body?: <BodyType>) =>
 *    http.<method>("<mswPath>", () => HttpResponse.json(body ?? <staticSample>, { status }));`
 *
 * Opt-in (not added to `handlers`): `server.use(getPetErrorHandler(404))` overrides the
 * happy path with an error. `<StatusUnion>` is the declared error statuses as literals
 * (plus `number` when a `default` error is present, so any status is allowed). The static
 * fallback samples the FIRST error response's schema.
 */
function errorHandlerFor(op: OperationModel, model: ApiModel, opts: MockOptions): string {
  const first = op.errorResponses[0];
  const sampled = renderMockValue(bodyValue(first.schema, model, opts), '');
  const resolver = `() => HttpResponse.json(body ?? ${sampled}, { status })`;
  const call = `http.${codeIdent(op.method)}(${JSON.stringify(mswPath(op.path))}, ${resolver})`;
  return `export const ${codeIdent(op.name)}ErrorHandler = (status: ${errorStatusType(op)}, body?: ${errorBodyType(op)}) => ${call};`;
}

/**
 * A union of the op's declared numeric error statuses (as literals); `number` is used in place
 * of a literal whenever a `default` error or a `4XX`/`5XX` range is present, so any status is
 * accepted. De-duped, since a multi-media-type error contributes the same status more than once.
 */
function errorStatusType(op: OperationModel): string {
  const codes = [
    ...new Set(
      op.errorResponses.filter((r) => typeof r.status === 'number').map((r) => r.status as number)
    ),
  ];
  const members: string[] = codes.map(String);
  // A `default` error (or a range wildcard) means any status is valid — widen with `number`.
  if (op.errorResponses.some((r) => typeof r.status !== 'number')) {
    members.push('number');
  }
  return members.join(' | ');
}

/**
 * The `body?` type: the union of the error responses' body types — `ref` bodies map to their
 * named type, anything else to `unknown` (matching how the success handler types its override
 * loosely). De-duped by printed name.
 */
function errorBodyType(op: OperationModel): string {
  const names = new Set<string>();
  let hasUnknown = false;
  for (const r of op.errorResponses) {
    if (r.schema.kind === 'ref') names.add(r.schema.name);
    else hasUnknown = true;
  }
  const members = [...names];
  if (hasUnknown || members.length === 0) members.push('unknown');
  return members.join(' | ');
}

/**
 * The handler's `override?` parameter, present only when the response consumes it.
 * A `ref` success body forwards `override` to `create<Schema>(override)`, so its type
 * mirrors the factory's parameter (`Partial<Schema>`, or the full type when the factory
 * replaces wholesale — see `factoryFor`). An inline object body spreads `override`, typed
 * `Record<string, unknown>`. A body-less or non-object inline response has nothing to
 * override, so the handler takes no parameter.
 */
function overrideParam(op: OperationModel, model: ApiModel, opts: MockOptions): string | undefined {
  const success = op.successResponses[0];
  if (!success || success.schema.kind === 'unknown') return undefined;
  if (success.schema.kind === 'ref') {
    const typeName = success.schema.name;
    const type = isObjectValue(bodyValue(success.schema, model, opts))
      ? `Partial<${typeName}>`
      : typeName;
    return `override?: ${type}`;
  }
  if (!isObjectValue(bodyValue(success.schema, model, opts))) return undefined;
  return 'override?: Record<string, unknown>';
}

/**
 * The handler's response. A primary success body becomes `HttpResponse.json(…)`:
 * a `ref` body calls its named `create<Schema>(override)` factory; an inline body
 * is sampled and printed in place with `...override` spread in. A success with no
 * usable body (an `unknown` schema, or no success response at all) becomes a
 * body-less `new HttpResponse(null, { status })`. The status is the success
 * response's declared code, or 200 when it's `default`/absent.
 */
function responseExpression(op: OperationModel, model: ApiModel, opts: MockOptions): string {
  const success = op.successResponses[0];
  const status = statusCode(success?.status);
  if (!success || success.schema.kind === 'unknown') {
    return `new HttpResponse(null, { status: ${status} })`;
  }
  const data =
    success.schema.kind === 'ref'
      ? `create${pascalCase(success.schema.name)}(override)`
      : renderMockValue(spreadInto(bodyValue(success.schema, model, opts), 'override'), '');
  // `HttpResponse.json(x)` already defaults to 200, so only pass `{ status }` when it differs.
  const args = status === 200 ? data : `${data}, { status: ${status} }`;
  return `HttpResponse.json(${args})`;
}

/** Numeric status for a response, mapping `default`/absent to 200. */
function statusCode(status: ResponseBodyModel['status'] | undefined): number {
  return typeof status === 'number' ? status : 200;
}

/** `export const handlers = [<op>Handler(), …];`. */
function handlersArray(operations: OperationModel[]): string {
  const elements = operations.map((op) => `${codeIdent(op.name)}Handler()`).join(', ');
  return `export const handlers = [${elements}];`;
}

/** `/pets/{petId}` → `*​/pets/:petId` — MSW path with a wildcard origin and `:param` segments. */
function mswPath(path: string): string {
  return `*${path.replace(/\{([^{}]+)\}/g, ':$1')}`;
}

/** Recursively lift a sampled JS value into the render tree. Containers render
 *  multiline; a `SampleExpression` carries pre-built source (`new Date(...)`). */
function literal(value: unknown): MockValue {
  if (value instanceof SampleExpression) return expr(value.code);
  if (Array.isArray(value)) return { kind: 'array', items: value.map(literal) };
  if (isPlainObject(value)) {
    return objectValue(
      Object.entries(value).map(([key, entryValue]) => ({ key, value: literal(entryValue) }))
    );
  }
  return expr(codeLiteral(value));
}
