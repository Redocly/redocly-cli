import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { goGenerator, renderGoModels } from '../go.js';

const hasGo = spawnSync('go', ['version']).status === 0;

/** Assert the rendered source is compilable Go (skipped without the toolchain). */
function expectGoCompiles(source: string): void {
  if (!hasGo) return;
  const dir = mkdtempSync(join(tmpdir(), 'go-render-'));
  try {
    writeFileSync(join(dir, 'go.mod'), 'module render.test\n\ngo 1.21\n');
    writeFileSync(join(dir, 'models.go'), source);
    const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
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

describe('renderGoModels', () => {
  it('renders structs — required as value fields, optional as pointers with omitempty tags', () => {
    const out = renderGoModels(
      model({
        Order: {
          kind: 'object',
          description: 'One placed order.',
          properties: [
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
            { name: 'note', schema: STRING, required: false },
          ],
        },
      })
    );
    expect(out).toContain('// Order — One placed order.');
    expect(out).toContain('type Order struct {');
    expect(out).toContain('Id string `json:"id"`');
    expect(out).toContain('Quantity int64 `json:"quantity"`');
    expect(out).toContain('Note *string `json:"note,omitempty"`');
    expectGoCompiles(out);
  });

  it('flattens allOf; json tags carry wire names for sanitized fields', () => {
    const out = renderGoModels(
      model({
        Base: { kind: 'object', properties: [{ name: 'offset', schema: INT, required: false }] },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                { name: 'items', schema: { kind: 'array', items: STRING }, required: true },
                { name: 'go', schema: STRING, required: true }, // Go keyword as a wire name
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('type Page struct {');
    expect(out).toContain('Items []string `json:"items"`');
    // The exported field name is always usable; the tag keeps the exact wire name.
    expect(out).toContain('`json:"go"`');
    expectGoCompiles(out);
  });

  it('renders named enums as typed consts and discriminated unions with an unmarshal dispatcher', () => {
    const out = renderGoModels(
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
    expect(out).toContain('type Status string');
    expect(out).toContain('StatusInProgress Status = "in-progress"');
    expect(out).toContain('type Pet = any');
    expect(out).toContain('func UnmarshalPet(data []byte) (Pet, error)');
    expect(out).toContain('case "cat":');
    expectGoCompiles(out);
  });

  it('keeps +1 and -1 fields distinct and exported (GitHub reactions)', () => {
    const out = renderGoModels(
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
    expect(out).toContain('Plus1 int64 `json:"+1"`');
    expect(out).toContain('Minus1 int64 `json:"-1"`');
    expectGoCompiles(out);
  });

  it('maps nullability and records to pointers and maps', () => {
    const out = renderGoModels(
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
    expect(out).toContain('Tag *string `json:"tag"`');
    expect(out).toContain('Meta map[string]string `json:"meta"`');
    expectGoCompiles(out);
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
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
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

function generateGo(): string {
  const files = goGenerator({
    model: CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: {},
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/client.go');
  return files[0].content;
}

describe('goGenerator (full client assembly)', () => {
  it('renders (T, error) methods over the operations table with typed params structs', () => {
    const out = generateGo();
    expect(out).toContain('type Client struct {');
    expect(out).toContain('func New(config Config) *Client {');
    expect(out).toContain('type ListOrdersParams struct {');
    expect(out).toContain('After *string');
    expect(out).toContain(
      'func (c *Client) ListOrders(ctx context.Context, params *ListOrdersParams) (OrderPage, error) {'
    );
    expect(out).toContain(
      'func (c *Client) GetOrder(ctx context.Context, orderId string) (Order, error) {'
    );
    expect(out).toContain(
      'func (c *Client) CreateOrder(ctx context.Context, body Order) (Order, error) {'
    );
    expect(out).toContain('return out, apiErrorFrom(resp, requestURL)');
  });

  it('assembles one compilable file: models + embedded runtime + operations table', () => {
    const out = generateGo();
    expect(out).toContain('var operations = map[string]operationMeta{');
    expect(out).toContain('"listOrders": {');
    expect(out).toContain('func send(ctx context.Context'); // embedded runtime
    expect((out.match(/^package client$/gm) ?? []).length).toBe(1);
    expectGoCompiles(out);
  });
});

describe('goGenerator parity features', () => {
  it('paginated operations gain Pages/Items yield-func iterators with typed elements', () => {
    const out = generateGo();
    expect(out).toContain('Pagination: &PaginationSpec{Style: "cursor", Param: "after"');
    expect(out).toContain(
      'func (c *Client) ListOrdersPages(ctx context.Context, params *ListOrdersParams) func(yield func(OrderPage, error) bool) {'
    );
    expect(out).toContain(
      'func (c *Client) ListOrdersItems(ctx context.Context, params *ListOrdersParams) func(yield func(Order, error) bool) {'
    );
    expect(out).toContain('iterPages(call, *op.Pagination, base)');
  });

  it('SSE operations stream events; multipart bodies route through toMultipart', () => {
    const out = generateGo();
    expect(out).toContain(
      'func (c *Client) StreamEvents(ctx context.Context) func(yield func(ServerSentEvent, error) bool) {'
    );
    expect(out).toContain('return iterSSE(open,');
    expect(out).toContain('contentType, reader, err := toMultipart(body)');
    expectGoCompiles(out);
  });
});
