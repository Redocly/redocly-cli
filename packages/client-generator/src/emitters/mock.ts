// Emits a `*.mocks.ts` module: a `create<Schema>(overrides?)` data factory per
// named schema, an `<op>Handler(override?)` MSW request handler per operation
// (its primary success response), and an aggregated `handlers` array. Response
// data is baked at codegen time via the sampler (`sampleValue`) and printed as
// TypeScript literals through `ts.factory`, so the generated module depends only
// on `msw` — the real client stays zero-dependency.

import { isPlainObject } from '@redocly/openapi-core';

import {
  allOperations,
  type ApiModel,
  type NamedSchemaModel,
  type OperationModel,
  type ResponseBodyModel,
  type SchemaModel,
} from '../intermediate-representation/model.js';
import { fakerExpression } from './faker.js';
import { safeIdent } from './identifier.js';
import { sampleValue, SampleExpression } from './sample.js';
import { pascalCase } from './support.js';
import { literalExpression, parseExpression, printStatements, ts } from './ts.js';
import type { DateType } from './types.js';

const { factory } = ts;

export type MockOptions = {
  /** Import specifier for the sdk entry the schema types live in. */
  sdkModule: string;
  /** Must match the sdk's `--date-type`: under `'Date'` the sampler bakes date
   *  fields as `new Date(...)` so the mock data matches the `Date`-typed sdk. */
  dateType?: DateType;
  /**
   * How factory/handler bodies produce data. `'baked'` (default) inlines deterministic
   * literals from the sampler (zero-dep, contract-faithful). `'faker'` emits
   * `@faker-js/faker` calls for realistic data — reproducible when `mockSeed` is set —
   * making `@faker-js/faker` the consumer's dev-dep. Factory signatures are identical
   * across modes, so a consumer can flip this without changing call sites.
   */
  mockData?: 'baked' | 'faker';
  /** When set in `'faker'` mode, emit a top-level `faker.seed(<n>);` so runs reproduce. */
  mockSeed?: number;
};

/** The body expression for `schema` under the active data mode: a baked literal tree
 *  (`'baked'`) or a tree of `@faker-js/faker` calls (`'faker'`). Both honor `dateType`
 *  and the binary/Blob type demand; the faker path inlines refs with the same cycle
 *  guard as the baked sampler, so neither recurses forever on a cyclic schema. */
function bodyExpression(schema: SchemaModel, model: ApiModel, opts: MockOptions): ts.Expression {
  return opts.mockData === 'faker'
    ? fakerExpression(schema, model.schemas, { dateType: opts.dateType })
    : literal(sampleValue(schema, model.schemas, { dateType: opts.dateType }));
}

/** Render the full `*.mocks.ts` source. `''` when the model has no operations. */
export function renderMockModule(model: ApiModel, opts: MockOptions): string {
  const operations = allOperations(model.services);
  if (operations.length === 0) return '';
  const factories = model.schemas.map((s) => factoryFor(s, model, opts));
  const handlers = operations.flatMap((op) => [
    handlerFor(op, model, opts),
    ...(op.errorResponses.length > 0 ? [errorHandlerFor(op, model, opts)] : []),
  ]);
  const typeImport = schemaTypeImport(model, opts);
  // Faker mode imports `faker` (the consumer's dev-dep) and, with a seed, pins it once
  // at module top so every run reproduces. Baked mode emits neither (stays zero-dep).
  const fakerImport = opts.mockData === 'faker' ? "import { faker } from '@faker-js/faker';\n" : '';
  const seed =
    opts.mockData === 'faker' && opts.mockSeed !== undefined ? [seedStatement(opts.mockSeed)] : [];
  return `import { http, HttpResponse } from 'msw';\n${fakerImport}\n${printStatements([
    ...typeImport,
    ...seed,
    ...factories,
    ...handlers,
    handlersArray(operations),
  ])}`;
}

/** `faker.seed(<n>);` — pins faker's PRNG so a seeded faker-mode module reproduces. */
function seedStatement(seed: number): ts.Statement {
  return factory.createExpressionStatement(
    factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('faker'), 'seed'),
      undefined,
      [factory.createNumericLiteral(seed)]
    )
  );
}

/**
 * `import type { A, B, … } from '<sdkModule>';` — the named-schema types the factories
 * reference (`create<Pascal>` returns/accepts `<Pascal>`). Sorted for stable output.
 * Empty when the model has no named schemas (so no type import is emitted). Importing
 * the schema types also shadows globals of the same name (e.g. an `Error` schema) so the
 * factory return types resolve to the generated type, not `globalThis.Error`.
 */
function schemaTypeImport(model: ApiModel, opts: MockOptions): ts.Statement[] {
  if (model.schemas.length === 0) return [];
  const names = model.schemas.map((s) => pascalCase(s.name)).sort();
  return [
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(
        true,
        undefined,
        factory.createNamedImports(
          names.map((name) =>
            factory.createImportSpecifier(false, undefined, factory.createIdentifier(name))
          )
        )
      ),
      factory.createStringLiteral(opts.sdkModule)
    ),
  ];
}

/** `export function create<Pascal>(overrides?: Partial<Pascal>): Pascal { return { …sampled, ...overrides }; }`. */
function factoryFor(named: NamedSchemaModel, model: ApiModel, opts: MockOptions): ts.Statement {
  const pascal = pascalCase(named.name);
  const sampled = bodyExpression(named.schema, model, opts);
  const typeRef = factory.createTypeReferenceNode(pascal);
  // Spreading `Partial<Union>` (the override type of a union schema) distributes into
  // `Partial<A> | Partial<B>`, which widens any discriminant property (e.g. `category`)
  // and defeats narrowing — TS can no longer place the literal in a single union member.
  // The sampled object is already a complete, correct member, so re-assert the type.
  const body =
    named.schema.kind === 'union'
      ? factory.createAsExpression(spreadOverrides(sampled, 'overrides'), typeRef)
      : spreadOverrides(sampled, 'overrides');
  return factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    `create${pascal}`,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'overrides',
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createTypeReferenceNode('Partial', [typeRef])
      ),
    ],
    typeRef,
    factory.createBlock([factory.createReturnStatement(body)], true)
  );
}

/** `export const <op>Handler = (override?: <OverrideType>) => http.<method>('<path>', () => <response>);`. */
function handlerFor(op: OperationModel, model: ApiModel, opts: MockOptions): ts.Statement {
  const arrow = factory.createArrowFunction(
    undefined,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'override',
        factory.createToken(ts.SyntaxKind.QuestionToken),
        overrideType(op)
      ),
    ],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    handlerCall(op, model, opts)
  );
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(`${op.name}Handler`, undefined, undefined, arrow)],
      ts.NodeFlags.Const
    )
  );
}

/**
 * `export const <op>ErrorHandler = (status: <StatusUnion>, body?: <BodyType>) =>
 *    http.<method>("<mswPath>", () => HttpResponse.json(body ?? <bakedSample>, { status }));`
 *
 * Opt-in (not added to `handlers`): `server.use(getPetErrorHandler(404))` overrides the
 * happy path with an error. `<StatusUnion>` is the declared error statuses as literals
 * (plus `number` when a `default` error is present, so any status is allowed). The baked
 * fallback samples the FIRST error response's schema.
 */
function errorHandlerFor(op: OperationModel, model: ApiModel, opts: MockOptions): ts.Statement {
  const first = op.errorResponses[0];
  const baked = bodyExpression(first.schema, model, opts);
  const body = factory.createBinaryExpression(
    factory.createIdentifier('body'),
    factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    baked
  );
  const resolver = factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('HttpResponse'), 'json'),
      undefined,
      [
        body,
        factory.createObjectLiteralExpression(
          [factory.createShorthandPropertyAssignment('status')],
          false
        ),
      ]
    )
  );
  const call = factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('http'), op.method),
    undefined,
    [factory.createStringLiteral(mswPath(op.path)), resolver]
  );
  const arrow = factory.createArrowFunction(
    undefined,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'status',
        undefined,
        errorStatusType(op)
      ),
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'body',
        factory.createToken(ts.SyntaxKind.QuestionToken),
        errorBodyType(op)
      ),
    ],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    call
  );
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(`${op.name}ErrorHandler`, undefined, undefined, arrow)],
      ts.NodeFlags.Const
    )
  );
}

/**
 * A union of the op's declared numeric error statuses (as literals); `number` is used in place
 * of a literal whenever a `default` error is present, so any status is accepted. De-duped, since
 * a multi-media-type error contributes the same status more than once.
 */
function errorStatusType(op: OperationModel): ts.TypeNode {
  const codes = [
    ...new Set(
      op.errorResponses.filter((r) => r.status !== 'default').map((r) => r.status as number)
    ),
  ];
  const members: ts.TypeNode[] = codes.map((c) =>
    factory.createLiteralTypeNode(factory.createNumericLiteral(c))
  );
  // A `default` error means any status is valid, so widen the union with `number`.
  if (op.errorResponses.some((r) => r.status === 'default')) {
    members.push(factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
  }
  return members.length === 1 ? members[0] : factory.createUnionTypeNode(members);
}

/**
 * The `body?` type: the union of the error responses' body types — `ref` bodies map to their
 * named type, anything else to `unknown` (matching how the success handler types its override
 * loosely). De-duped by printed name.
 */
function errorBodyType(op: OperationModel): ts.TypeNode {
  const names = new Set<string>();
  let hasUnknown = false;
  for (const r of op.errorResponses) {
    if (r.schema.kind === 'ref') names.add(pascalCase(r.schema.name));
    else hasUnknown = true;
  }
  const members: ts.TypeNode[] = [...names].map((n) => factory.createTypeReferenceNode(n));
  if (hasUnknown || members.length === 0) {
    members.push(factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
  }
  return members.length === 1 ? members[0] : factory.createUnionTypeNode(members);
}

/**
 * The static type of a handler's `override?` parameter, matching how the response uses it.
 * A `ref` success body forwards `override` to `create<Schema>(override)` (whose parameter is
 * `Partial<Schema>`), so the override is `Partial<Schema>`. Otherwise `override` is either spread
 * into an inline object literal or unused, so `Record<string, unknown>` types it without error.
 */
function overrideType(op: OperationModel): ts.TypeNode {
  const success = op.successResponses[0];
  if (success?.schema.kind === 'ref') {
    return factory.createTypeReferenceNode('Partial', [
      factory.createTypeReferenceNode(pascalCase(success.schema.name)),
    ]);
  }
  return factory.createTypeReferenceNode('Record', [
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
  ]);
}

/** `http.<method>('<mswPath>', () => <responseExpr>)`. */
function handlerCall(op: OperationModel, model: ApiModel, opts: MockOptions): ts.Expression {
  const resolver = factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    responseExpression(op, model, opts)
  );
  return factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('http'), op.method),
    undefined,
    [factory.createStringLiteral(mswPath(op.path)), resolver]
  );
}

/**
 * The handler's response. A primary success body becomes `HttpResponse.json(…)`:
 * a `ref` body calls its named `create<Schema>(override)` factory; an inline body
 * is sampled and printed in place with `...override` spread in. A success with no
 * usable body (an `unknown` schema, or no success response at all) becomes a
 * body-less `new HttpResponse(null, { status })`. The status is the success
 * response's declared code, or 200 when it's `default`/absent.
 */
function responseExpression(op: OperationModel, model: ApiModel, opts: MockOptions): ts.Expression {
  const success = op.successResponses[0];
  const status = statusCode(success?.status);
  if (!success || success.schema.kind === 'unknown') return emptyResponse(status);
  const data =
    success.schema.kind === 'ref'
      ? factory.createCallExpression(
          factory.createIdentifier(`create${pascalCase(success.schema.name)}`),
          undefined,
          [factory.createIdentifier('override')]
        )
      : spreadOverrides(bodyExpression(success.schema, model, opts), 'override');
  // `HttpResponse.json(x)` already defaults to 200, so only pass `{ status }` when it differs.
  const args = status === 200 ? [data] : [data, statusInit(status)];
  return factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('HttpResponse'), 'json'),
    undefined,
    args
  );
}

/** Numeric status for a response, mapping `default`/absent to 200. */
function statusCode(status: ResponseBodyModel['status'] | undefined): number {
  return typeof status === 'number' ? status : 200;
}

/** `{ status: <n> }`. */
function statusInit(status: number): ts.Expression {
  return factory.createObjectLiteralExpression(
    [factory.createPropertyAssignment('status', factory.createNumericLiteral(status))],
    false
  );
}

/** `new HttpResponse(null, { status: <n> })`. */
function emptyResponse(status: number): ts.Expression {
  return factory.createNewExpression(factory.createIdentifier('HttpResponse'), undefined, [
    factory.createNull(),
    statusInit(status),
  ]);
}

/** `export const handlers = [<op>Handler(), …];`. */
function handlersArray(operations: OperationModel[]): ts.Statement {
  const elements = operations.map((op) =>
    factory.createCallExpression(factory.createIdentifier(`${op.name}Handler`), undefined, [])
  );
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          'handlers',
          undefined,
          undefined,
          factory.createArrayLiteralExpression(elements, false)
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/** Spread `<spreadName>` into an object literal; non-object values pass through unchanged. */
function spreadOverrides(value: ts.Expression, spreadName: string): ts.Expression {
  if (!ts.isObjectLiteralExpression(value)) return value;
  return factory.createObjectLiteralExpression(
    [...value.properties, factory.createSpreadAssignment(factory.createIdentifier(spreadName))],
    true
  );
}

/** `/pets/{petId}` → `*​/pets/:petId` — MSW path with a wildcard origin and `:param` segments. */
function mswPath(path: string): string {
  return `*${path.replace(/\{([^{}]+)\}/g, ':$1')}`;
}

/** Recursively print a sampled JS value as a TypeScript literal expression. Containers
 *  stay local rather than delegating to the shared `literalExpression`: sampled trees
 *  print multiline and may nest a `SampleExpression` at any depth. */
function literal(value: unknown): ts.Expression {
  if (value instanceof SampleExpression) return parseExpression(value.code);
  if (Array.isArray(value)) {
    return factory.createArrayLiteralExpression(value.map(literal), true);
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    return factory.createObjectLiteralExpression(
      entries.map(([key, v]) => {
        const safe = safeIdent(key);
        const name =
          safe === key ? factory.createIdentifier(key) : factory.createStringLiteral(key);
        return factory.createPropertyAssignment(name, literal(v));
      }),
      true
    );
  }
  return literalExpression(value);
}
