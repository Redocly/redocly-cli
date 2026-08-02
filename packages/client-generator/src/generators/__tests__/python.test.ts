import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { pythonGenerator, renderPythonModels } from '../python.js';

const hasPython = spawnSync('python3', ['--version']).status === 0;

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
});
