import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveModelPagination } from '../../emitters/pagination.js';
import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { pythonGenerator as pythonGeneratorEntry, renderPythonModels } from '../python/index.js';

// The pipeline resolves pagination once and hands generators the map; these direct
// calls mirror that step.
const pythonGenerator = (input: Omit<Parameters<typeof pythonGeneratorEntry>[0], 'pagination'>) =>
  pythonGeneratorEntry({ ...input, pagination: resolveModelPagination(input.model, undefined) });

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;

/** Assert the rendered source is valid Python (skipped when python3 is absent). */
function expectCompiles(source: string): void {
  if (!hasPython) return;
  const dir = mkdtempSync(join(tmpdir(), 'py-render-'));
  try {
    const file = join(dir, 'models.py');
    writeFileSync(file, source);
    const result = spawnSync('python3', ['-m', 'py_compile', file], { encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };
const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

function model(schemas: Record<string, SchemaModel>): ApiModel {
  return {
    title: 'Cafe',
    version: '1.0.0',
    services: [],
    schemas: Object.entries(schemas).map(([name, schema]) => ({ name, schema })),
    securitySchemes: [],
  } as unknown as ApiModel;
}

describe('renderPythonModels', () => {
  it('renders an object schema as a dataclass — required fields first, optional with = None', () => {
    const out = renderPythonModels(
      model({
        Order: {
          kind: 'object',
          description: 'One placed order.',
          properties: [
            { name: 'note', schema: STRING, required: false },
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('from __future__ import annotations');
    expect(out).toContain('@dataclass\nclass Order:');
    expect(out).toContain('"""One placed order."""');
    // Required (no default) precede optional (= None) — a Python dataclass constraint.
    const id = out.indexOf('id: str');
    const note = out.indexOf('note: Optional[str] = None');
    expect(id).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(id);
  });

  it("renders pydantic models under models: 'pydantic', with wire names as aliases", () => {
    const out = renderPythonModels(
      model({
        Order: {
          kind: 'object',
          properties: [
            { name: 'id', schema: STRING, required: true },
            // A wire name that is not a legal Python field name: the alias carries it.
            { name: 'class', schema: STRING, required: false },
          ],
        },
      }),
      'string',
      'pydantic'
    );
    expect(out).toContain('from pydantic import BaseModel, ConfigDict, Field');
    expect(out).toContain('class Order(BaseModel):');
    expect(out).toContain('model_config = ConfigDict(populate_by_name=True)');
    expect(out).toContain('id: str');
    expect(out).toContain('class_: Optional[str] = Field(default=None, alias="class")');
    // The alias replaces `_field_map`, and `ClassVar` typed only that map.
    expect(out).not.toContain('@dataclass');
    expect(out).not.toContain('_field_map');
    expect(out).not.toContain('ClassVar');
    expect(out).not.toContain('from dataclasses import');
  });

  it('flattens allOf compositions into one dataclass', () => {
    const out = renderPythonModels(
      model({
        Base: {
          kind: 'object',
          properties: [{ name: 'offset', schema: INT, required: false }],
        },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                { name: 'items', schema: { kind: 'array', items: STRING }, required: true },
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('@dataclass\nclass Page:');
    expect(out).toContain('items: List[str]');
    expect(out).toContain('offset: Optional[int] = None');
  });

  it('renders enums with SCREAMING members and unions as aliases with a discriminator table', () => {
    const out = renderPythonModels(
      model({
        Status: { kind: 'enum', values: ['in-progress', 'done'], scalar: 'string' },
        Cat: { kind: 'object', properties: [] },
        Dog: { kind: 'object', properties: [] },
        Pet: {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Cat' },
            { kind: 'ref', name: 'Dog' },
          ],
          discriminator: {
            propertyName: 'petType',
            mapping: [
              { value: 'cat', schemaName: 'Cat' },
              { value: 'dog', schemaName: 'Dog' },
            ],
          },
        },
      })
    );
    expect(out).toContain('class Status(str, Enum):');
    expect(out).toContain('IN_PROGRESS = "in-progress"');
    expect(out).toContain('Pet = Union[Cat, Dog]');
    expect(out).toContain('# Discriminated by "petType": cat -> Cat, dog -> Dog');
    expectCompiles(out);
  });

  /** Cat/Dog under a `petType` discriminator; `declares` controls whether they declare it. */
  function petUnion(declares: boolean) {
    const member = {
      kind: 'object' as const,
      properties: declares ? [{ name: 'petType', schema: STRING, required: true }] : [],
    };
    return {
      Cat: member,
      Dog: member,
      Pet: {
        kind: 'union' as const,
        members: [
          { kind: 'ref' as const, name: 'Cat' },
          { kind: 'ref' as const, name: 'Dog' },
        ],
        discriminator: {
          propertyName: 'petType',
          mapping: [
            { value: 'cat', schemaName: 'Cat' },
            { value: 'dog', schemaName: 'Dog' },
          ],
        },
      },
    };
  }

  it('pins the discriminator as a Literal so pydantic resolves a nested union', () => {
    const out = renderPythonModels(model(petUnion(true)), 'string', 'pydantic');
    expect(out).toContain('pet_type: Literal["cat"] = Field(alias="petType")');
    expect(out).toContain('pet_type: Literal["dog"] = Field(alias="petType")');
    expect(out).toContain('Pet = Annotated[Union[Cat, Dog], Field(discriminator="pet_type")]');
    expect(out).toContain('Annotated');
    expectCompiles(out);
  });

  it('leaves the union plain when its members do not declare the discriminator', () => {
    const out = renderPythonModels(model(petUnion(false)), 'string', 'pydantic');
    expect(out).toContain('Pet = Union[Cat, Dog]');
    expect(out).not.toContain('Annotated');
    // Dataclass mode never annotates: it walks the fields and reads the table itself.
    const dataclasses = renderPythonModels(model(petUnion(true)), 'string', 'dataclass');
    expect(dataclasses).toContain('Pet = Union[Cat, Dog]');
    expect(dataclasses).toContain('pet_type: str');
    expectCompiles(out);
  });

  it('sanitizes reserved-word field names and records the wire mapping', () => {
    const out = renderPythonModels(
      model({
        Lesson: {
          kind: 'object',
          properties: [{ name: 'class', schema: STRING, required: true }],
        },
      })
    );
    expect(out).toContain('class_: str');
    expect(out).toContain('"class_": "class"');
    expectCompiles(out);
  });

  it('keeps +1 and -1 fields distinct (a collision silently drops one from the field map)', () => {
    const out = renderPythonModels(
      model({
        Reactions: {
          kind: 'object',
          properties: [
            { name: '+1', schema: INT, required: true },
            { name: '-1', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('plus_1: int');
    expect(out).toContain('minus_1: int');
    expect(out).toContain('"plus_1": "+1"');
    expect(out).toContain('"minus_1": "-1"');
    expectCompiles(out);
  });

  it('renders nullable and record shapes idiomatically', () => {
    const out = renderPythonModels(
      model({
        Thing: {
          kind: 'object',
          properties: [
            {
              name: 'tag',
              schema: { kind: 'union', members: [STRING, { kind: 'null' }] },
              required: true,
            },
            { name: 'meta', schema: { kind: 'record', value: STRING }, required: true },
          ],
        },
      })
    );
    expect(out).toContain('tag: Optional[str]');
    expect(out).toContain('meta: Dict[str, str]');
  });
});

const CAFE: ApiModel = {
  title: 'Cafe',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example/organizations/unknown',
  servers: [
    {
      url: 'https://api.cafe.example/organizations/{organizationId}',
      description: 'Live server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
    {
      url: 'https://api-sandbox.cafe.example/organizations/{organizationId}',
      description: 'Sandbox server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
  ],
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            { name: 'after', in: 'query', required: false, schema: STRING },
            { name: 'limit', in: 'query', required: false, schema: INT },
          ],
          headerParams: [],
          cookieParams: [],
          security: [['BearerAuth']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponseHeaders: [
            {
              name: 'pagination-total',
              schema: { kind: 'scalar', scalar: 'integer' },
              required: true,
            },
            { name: 'link', schema: { kind: 'scalar', scalar: 'string' } },
          ],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'OrderPage' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
          errorResponses: [],
        },
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'createOrder',
          specName: 'createOrder',
          method: 'post',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: { contentType: 'application/json', schema: { kind: 'ref', name: 'Order' } },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: {
        kind: 'object',
        properties: [{ name: 'id', schema: STRING, required: true }],
      },
    },
    {
      name: 'OrderPage',
      schema: {
        kind: 'object',
        properties: [
          {
            name: 'items',
            schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
            required: true,
          },
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;

function generate(errorMode: 'throw' | 'result' = 'throw'): string {
  const files = pythonGenerator({
    model: CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: { errorMode },
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/client.py');
  return files[0].content;
}

describe('python auth keys', () => {
  it('accepts apiKey (the documented, cross-language key) and api_key alike', () => {
    if (!hasHttpx) return;
    const out = pythonGenerator({
      model: CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    const dir = mkdtempSync(join(tmpdir(), 'py-auth-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          'import client;' +
            ' spec = [[{"kind": "apiKey", "scheme": "K", "name": "X-Key", "in": "header"}]];' +
            ' print(client.resolve_auth(spec, {"apiKey": {"K": "v"}})[0]);' +
            ' print(client.resolve_auth(spec, {"api_key": {"K": "v"}})[0])',
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout.trim().split('\n')).toEqual(["{'X-Key': 'v'}", "{'X-Key': 'v'}"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('python output path', () => {
  const pathFor = (outputPath: string) =>
    pythonGenerator({ model: CAFE, outputPath, outputMode: 'single', emit: {} })[0].path;

  it('emits an importable module name — the TypeScript stem is not one', () => {
    // `openapi.client.py` and `rebilly-core.client.py` cannot be imported by name.
    expect(pathFor('/out/openapi.client.ts')).toBe('/out/openapi_client.py');
    expect(pathFor('/out/rebilly-core.client.ts')).toBe('/out/rebilly_core_client.py');
    // A stem that is already importable is left alone.
    expect(pathFor('/out/client.ts')).toBe('/out/client.py');
    // A leading digit would be a syntax error in an import.
    expect(pathFor('/out/3rd-party.client.ts')).toBe('/out/_3rd_party_client.py');
  });
});

describe('pythonGenerator (full client assembly)', () => {
  it('renders typed sync methods — kwargs for query params, positional path params, hydrated returns', () => {
    const out = generate();
    expect(out).toContain('class Client:');
    expect(out).toContain(
      'def list_orders(self, *, after: Optional[str] = None, limit: Optional[int] = None'
    );
    expect(out).toContain(') -> OrderPage:');
    expect(out).toContain('def get_order(self, order_id: str, *');
    expect(out).toContain('def create_order(self, body: Order, *');
    expect(out).toContain('return decode(OrderPage, _safe_json(response))');
    // Wire names survive the snake_case kwargs.
    expect(out).toContain('params["after"] = encode(after)');
  });

  it('embeds the runtime, the descriptor table, and an async mirror', () => {
    const out = generate();
    expect(out).toContain('def send('); // embedded runtime
    expect(out).toContain('async def send_async('); // async mirror
    expect(out).toContain('_OPERATIONS = {');
    expect(out).toContain('"id": "listOrders"');
    expect(out).toContain('class AsyncClient:');
    expect(out).toContain('async def list_orders(');
    expect(out).not.toContain('from ._'); // relative imports stitched away
  });

  it('raises ApiError in throw mode; returns Result in result mode', () => {
    expect(generate('throw')).toContain('raise ApiError(');
    const result = generate('result');
    expect(result).toContain(') -> Result:');
    expect(result).toContain('return Result(data=None, error=');
  });

  it('the assembled file is valid Python', () => {
    expectCompiles(generate());
    expectCompiles(generate('result'));
  });
});

describe('pythonGenerator parity features', () => {
  it('paginated operations gain pages/items iterators, sync and async', () => {
    const out = generate();
    expect(out).toContain('"pagination": {"style": "cursor", "param": "after"');
    expect(out).toContain('def list_orders_pages(');
    expect(out).toContain('def list_orders_items(');
    expect(out).toContain('-> Iterator[Order]:'); // typed via schemaAtPointer on the items pointer
    expect(out).toContain('iter_pages(');
    expect(out).toContain('async for page in aiter_pages(');
    expect(out).toContain('-> Iterator[OrderPage]:');
  });

  it('an iterator takes the path parameters and substitutes them, like the call does', () => {
    // Without this the iterator requested the template literally (`/orders/{orderId}/items`)
    // and the caller had no argument to pass the value in.
    const out = pythonGenerator({
      model: {
        title: 'Nested',
        version: '1.0.0',
        serverUrl: 'https://api.example.com',
        schemas: [],
        securitySchemes: [],
        services: [
          {
            name: 'Orders',
            operations: [
              {
                name: 'listOrderItems',
                specName: 'listOrderItems',
                method: 'get',
                path: '/orders/{orderId}/items',
                tags: [],
                pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
                queryParams: [{ name: 'cursor', in: 'query', required: false, schema: STRING }],
                headerParams: [],
                cookieParams: [],
                security: [],
                paginationExtension: {
                  style: 'cursor',
                  cursorParam: 'cursor',
                  nextCursor: '/next',
                  items: '/items',
                },
                successResponses: [
                  {
                    status: '200',
                    contentType: 'application/json',
                    schema: {
                      kind: 'object',
                      properties: [
                        {
                          name: 'items',
                          schema: { kind: 'array', items: { kind: 'object', properties: [] } },
                          required: true,
                        },
                        { name: 'next', schema: STRING, required: false },
                      ],
                    },
                  },
                ],
                errorResponses: [],
              },
            ],
          },
        ],
      } as unknown as ApiModel,
      outputPath: '/tmp/client.ts',
      emit: {},
      outputMode: 'single',
    })[0].content;
    expect(out).toContain('def list_order_items_pages(self, order_id: str, *, cursor:');
    expect(out).toContain('def list_order_items_items(self, order_id: str, *, cursor:');
    expect(out).toContain('url = build_url(self._server_url, op["path"], {"orderId": order_id})');
  });

  it('SSE operations stream typed events; multipart bodies route through to_multipart', () => {
    const out = generate();
    expect(out).toContain('def stream_events(');
    expect(out).toContain('-> Iterator[ServerSentEvent]:');
    expect(out).toContain('iter_sse(');
    expect(out).toContain('-> AsyncIterator[ServerSentEvent]:');
    expect(out).toContain('aiter_sse(');
    expect(out).toContain('form_data, form_files = to_multipart(body)');
    expect(out).toContain('data=form_data, files=form_files');
    expectCompiles(out);
  });

  it('emits a _with_headers envelope variant only for ops with declared response headers', () => {
    const out = generate();
    expect(out).toContain('def list_orders_with_headers(');
    expect(out).toContain('async def list_orders_with_headers(');
    expect(out).toContain(') -> Envelope[OrderPage]:');
    expect(out).toContain(
      'read_envelope_headers(response, [("pagination-total", "pagination_total", "integer"), ("link", "link", "string")])'
    );
    // No declared headers, no variant.
    expect(out).not.toContain('get_order_with_headers');
    expectCompiles(out);
  });

  it('iterator signatures annotate a date query param like the method does', () => {
    // The `_pages`/`_items` wrappers dropped `dateType`, so `since` was `str` on the
    // iterator while the method beside it said `datetime`.
    const paged: ApiModel = {
      title: 'Cafe',
      version: '1.0.0',
      serverUrl: 'https://api.cafe.example',
      schemas: [],
      securitySchemes: [],
      services: [
        {
          name: 'Orders',
          operations: [
            {
              name: 'listOrders',
              specName: 'listOrders',
              method: 'get',
              path: '/orders',
              tags: [],
              pathParams: [],
              queryParams: [
                {
                  name: 'after',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string' },
                },
                {
                  name: 'since',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              ],
              headerParams: [],
              cookieParams: [],
              security: [],
              paginationExtension: {
                style: 'cursor',
                cursorParam: 'after',
                nextCursor: '/next',
                items: '/items',
              },
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: {
                    kind: 'object',
                    properties: [
                      {
                        name: 'items',
                        schema: { kind: 'array', items: { kind: 'object', properties: [] } },
                        required: true,
                      },
                      { name: 'next', schema: STRING, required: false },
                    ],
                  },
                },
              ],
              errorResponses: [],
            },
          ],
        },
      ],
    } as unknown as ApiModel;
    const out = pythonGenerator({
      model: paged,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;
    expect(out).toMatch(/def list_orders_pages\([^)]*since: Optional\[datetime\]/);
    expect(out).not.toMatch(/def list_orders_pages\([^)]*since: Optional\[str\]/);
  });

  it('maps date/date-time to datetime objects under dateType: Date, and round-trips them', () => {
    const dated: ApiModel = {
      title: 'Cafe',
      version: '1.0.0',
      serverUrl: 'https://api.cafe.example',
      services: [
        {
          name: 'Orders',
          operations: [
            {
              name: 'listOrders',
              specName: 'listOrders',
              method: 'get',
              path: '/orders',
              tags: ['Orders'],
              pathParams: [],
              queryParams: [
                {
                  name: 'since',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              ],
              headerParams: [],
              cookieParams: [],
              security: [],
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                },
              ],
              errorResponses: [],
            },
          ],
        },
      ],
      schemas: [
        {
          name: 'Order',
          schema: {
            kind: 'object',
            properties: [
              {
                name: 'placedAt',
                schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                required: true,
              },
              {
                name: 'dueDate',
                schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
                required: false,
              },
              {
                name: 'reminders',
                schema: {
                  kind: 'array',
                  items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
                required: false,
              },
            ],
          },
        },
      ],
      securitySchemes: [],
    } as unknown as ApiModel;

    const out = pythonGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;

    expect(out).toContain('from datetime import date, datetime');
    expect(out).toContain('placed_at: datetime');
    expect(out).toContain('due_date: Optional[date] = None');
    // Nested positions must convert too, not just top-level fields.
    expect(out).toContain('reminders: Optional[List[datetime]] = None');
    expect(out).toContain('since: Optional[datetime] = None');
    // dateType: string (the default) keeps the wire representation.
    const asString = pythonGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(asString).toContain('placed_at: str');
    expect(asString).not.toContain('placed_at: datetime');
    expectCompiles(out);

    // Behavioral: the runtime decodes ISO strings into objects and encodes them back.
    if (!hasHttpx) return;
    const dir = mkdtempSync(join(tmpdir(), 'py-dates-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          'import client;' +
            ' o = client.decode(client.Order, {"placedAt": "2026-08-05T10:00:00+00:00", "dueDate": "2026-08-06", "reminders": ["2026-08-07T12:00:00+00:00"]});' +
            ' print(type(o.placed_at).__name__, type(o.due_date).__name__, type(o.reminders[0]).__name__);' +
            ' print(client.encode(o))',
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toContain('datetime date datetime');
      expect(run.stdout).toContain('2026-08-06');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bakes the serverUrl option, not just the description server', () => {
    const files = pythonGenerator({
      model: CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { serverUrl: 'https://override.example' },
    });
    expect(files[0].content).toContain('server_url: str = "https://override.example"');
  });

  it('emits a Servers class with keyword arguments defaulting to the spec defaults', () => {
    const out = generate();
    expect(out).toContain('class Servers:');
    expect(out).toContain('def live_server(organization_id: str = "unknown") -> str:');
    expect(out).toContain('def sandbox_server(organization_id: str = "unknown") -> str:');
    expect(out).toContain('return "https://api.cafe.example/organizations/" + organization_id');
    expectCompiles(out);
  });

  it('decodes discriminated unions through the DISCRIMINATORS registry', () => {
    const files = pythonGenerator({
      model: {
        title: 'Pets',
        version: '1.0.0',
        serverUrl: 'https://pets.example',
        services: [],
        schemas: [
          { name: 'Cat', schema: { kind: 'object', properties: [] } },
          {
            name: 'Dog',
            schema: {
              kind: 'object',
              properties: [{ name: 'barks', schema: { kind: 'scalar', scalar: 'boolean' } }],
            },
          },
          {
            name: 'Pet',
            schema: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'Cat' },
                { kind: 'ref', name: 'Dog' },
              ],
              discriminator: {
                propertyName: 'petType',
                mapping: [
                  { value: 'cat', schemaName: 'Cat' },
                  { value: 'dog', schemaName: 'Dog' },
                ],
              },
            },
          },
        ],
        securitySchemes: [],
      } as unknown as ApiModel,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    });
    const out = files[0].content;
    expect(out).toContain('DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, "dog": Dog})');
    // Behavioral: first-member-wins would hydrate {"petType": "dog"} as Cat (empty
    // dataclasses accept anything); the registry must dispatch it to Dog.
    if (!hasHttpx) return;
    const dir = mkdtempSync(join(tmpdir(), 'py-dispatch-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          'import client; print(type(client.decode(client.Pet, {"petType": "dog"})).__name__)',
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout.trim()).toBe('Dog');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
