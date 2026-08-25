import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import {
  phpGenerator as phpGeneratorEntry,
  phpSample,
  phpType,
  renderPhpModels,
} from '../php/index.js';
import { generatorInput } from './fixtures/generator-input.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const phpGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  phpGeneratorEntry(generatorInput(input));

const hasPhp = spawnSync('php', ['--version']).status === 0;

/** Assert the rendered source parses AND declares cleanly (php -l, then require). */
function expectPhpRuns(source: string): void {
  if (!hasPhp) return;
  const dir = mkdtempSync(join(tmpdir(), 'php-render-'));
  try {
    writeFileSync(join(dir, 'client.php'), source);
    const lint = spawnSync('php', ['-l', 'client.php'], { cwd: dir, encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
    const declare = spawnSync('php', ['-r', "require 'client.php'; echo 'DECLARED';"], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(declare.status, `${declare.stdout}\n${declare.stderr}`).toBe(0);
    expect(declare.stdout).toContain('DECLARED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Models-only sources still need the file header to parse standalone. */
function expectModelsRun(models: string): void {
  expectPhpRuns(`<?php\n\ndeclare(strict_types=1);\n\n${models}`);
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

describe('phpType — unions', () => {
  const ENUM: SchemaModel = { kind: 'enum', values: ['a', 'b'], scalar: 'string' };
  const base = model({
    Kind: ENUM,
    Order: { kind: 'object', properties: [] },
  });

  it('renders a union of expressible members as a native PHP 8.1 union', () => {
    expect(phpType({ kind: 'union', members: [STRING, INT] }, base)).toBe('string|int');
    expect(
      phpType(
        {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Kind' },
            { kind: 'array', items: STRING },
          ],
        },
        base
      )
    ).toBe('Kind|array');
    // A class member keeps its class name.
    expect(
      phpType({ kind: 'union', members: [{ kind: 'ref', name: 'Order' }, STRING] }, base)
    ).toBe('Order|string');
  });

  it('expresses nullability as |null inside a union — PHP forbids mixing ? with |', () => {
    const type = phpType({ kind: 'union', members: [STRING, INT, { kind: 'null' }] }, base);
    expect(type).toBe('string|int|null');
    expect(type.startsWith('?')).toBe(false);
    // A single nullable type keeps the shorthand.
    expect(phpType({ kind: 'union', members: [STRING, { kind: 'null' }] }, base)).toBe('?string');
  });

  it('makes an OPTIONAL union nullable with |null, never a leading ?', () => {
    const out = renderPhpModels(
      model({
        Cash: { kind: 'object', properties: [] },
        Card: { kind: 'object', properties: [] },
        Customer: {
          kind: 'object',
          properties: [
            {
              name: 'instrument',
              schema: {
                kind: 'union',
                members: [
                  { kind: 'ref', name: 'Cash' },
                  { kind: 'ref', name: 'Card' },
                ],
              },
              required: false,
            },
          ],
        },
      })
    );
    expect(out).toContain('public Cash|Card|null $instrument = null');
    // `?Cash|Card` is a parse error.
    expect(out).not.toContain('?Cash|Card');
    expectModelsRun(out);
  });

  it('falls back to mixed when a member has no PHP type — mixed cannot be a union member', () => {
    const withInlineObject: SchemaModel = {
      kind: 'union',
      members: [STRING, { kind: 'object', properties: [] }],
    };
    expect(phpType(withInlineObject, base)).toBe('mixed');
    expect(phpType({ kind: 'union', members: [STRING, { kind: 'unknown' }] }, base)).toBe('mixed');
  });

  it('deduplicates members that map to the same PHP type', () => {
    expect(phpType({ kind: 'union', members: [STRING, ENUM] }, base)).toBe('string');
  });
});

describe('renderPhpModels', () => {
  it('renders classes — required first, optionals nullable with defaults, wire maps preserved', () => {
    const out = renderPhpModels(
      model({
        Order: {
          kind: 'object',
          description: 'One placed order.',
          properties: [
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
            { name: 'special-note', schema: STRING, required: false },
          ],
        },
      })
    );
    expect(out).toContain('final class Order');
    expect(out).toContain('public string $id');
    expect(out).toContain('public int $quantity');
    expect(out).toContain('public ?string $specialNote = null');
    expect(out).toContain("$data['special-note']"); // wire name survives in the field map
    expect(out).toContain('public static function fromArray(array $data): self');
    expect(out).toContain('public function toArray(): array');
    expectModelsRun(out);
  });

  it('flattens allOf and hydrates nested refs, arrays of refs, and enums', () => {
    const out = renderPhpModels(
      model({
        Base: { kind: 'object', properties: [{ name: 'offset', schema: INT, required: false }] },
        Status: { kind: 'enum', values: ['in-progress', 'done'], scalar: 'string' },
        Order: {
          kind: 'object',
          properties: [{ name: 'status', schema: { kind: 'ref', name: 'Status' }, required: true }],
        },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                {
                  name: 'items',
                  schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                  required: true,
                },
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('final class Page');
    expect(out).toContain('enum Status: string');
    expect(out).toContain("case InProgress = 'in-progress';");
    expect(out).toContain("Status::from($data['status'])");
    expect(out).toContain(
      "array_map(static fn ($item) => Order::fromArray($item), $data['items'])"
    );
    expectModelsRun(out);
  });

  it('renders discriminated unions as match dispatchers and keeps +1/-1 distinct', () => {
    const out = renderPhpModels(
      model({
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
        Reactions: {
          kind: 'object',
          properties: [
            { name: '+1', schema: INT, required: true },
            { name: '-1', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('function unmarshalPet(array $data): mixed');
    expect(out).toContain("'cat' => Cat::fromArray($data)");
    expect(out).toContain('public int $plus1');
    expect(out).toContain('public int $minus1');
    expectModelsRun(out);
  });

  it('hydrates discriminated-union properties through the dispatcher so instanceof works', () => {
    const out = renderPhpModels(
      model({
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
        Owner: {
          kind: 'object',
          properties: [
            { name: 'pet', schema: { kind: 'ref', name: 'Pet' }, required: true },
            {
              name: 'pets',
              schema: { kind: 'array', items: { kind: 'ref', name: 'Pet' } },
              required: false,
            },
          ],
        },
      })
    );
    expect(out).toContain("pet: unmarshalPet($data['pet'])");
    expect(out).toContain('array_map(static fn ($item) => unmarshalPet($item)');
    // Serialization must accept both hydrated instances and raw arrays.
    expect(out).toContain('is_object($this->pet) ? $this->pet->toArray() : $this->pet');
    expectModelsRun(out);
  });

  it('maps nullability and reserved names idiomatically', () => {
    const out = renderPhpModels(
      model({
        Lesson: {
          kind: 'object',
          properties: [
            {
              name: 'tag',
              schema: { kind: 'union', members: [STRING, { kind: 'null' }] },
              required: true,
            },
            { name: 'class', schema: STRING, required: true },
          ],
        },
      })
    );
    expect(out).toContain('public ?string $tag');
    expect(out).toContain('public string $class_');
    expect(out).toContain("$data['class']");
    expectModelsRun(out);
  });
});

const CAFE: ApiModel = {
  title: 'Cafe Orders API',
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
          name: 'getOrderPdf',
          specName: 'getOrderPdf',
          method: 'get',
          path: '/orders/{orderId}/pdf',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/pdf',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
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
          requestBody: {
            contentType: 'application/json',
            required: true,
            schema: { kind: 'ref', name: 'Order' },
          },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
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
            required: true,
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
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
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;

function generatePhp(): string {
  const files = phpGenerator({
    model: CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: {},
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/client.php');
  return files[0].content;
}

describe('method names are unique across the client', () => {
  const colliding: ApiModel = {
    title: 'Collide',
    version: '1.0.0',
    serverUrl: 'https://api.example.com',
    schemas: [],
    securitySchemes: [],
    services: [
      {
        name: 'Default',
        operations: [
          {
            name: 'get_user',
            specName: 'get-user',
            method: 'get',
            path: '/users/{id}',
            tags: [],
            pathParams: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { kind: 'scalar', scalar: 'string' },
              },
            ],
            queryParams: [],
            headerParams: [],
            cookieParams: [],
            security: [],
            successResponses: [],
            errorResponses: [],
          },
          {
            name: 'getUser',
            specName: 'getUser',
            method: 'get',
            path: '/users/by-name/{name}',
            tags: [],
            pathParams: [
              {
                name: 'name',
                in: 'path',
                required: true,
                schema: { kind: 'scalar', scalar: 'string' },
              },
            ],
            queryParams: [],
            headerParams: [],
            cookieParams: [],
            security: [],
            successResponses: [],
            errorResponses: [],
          },
        ],
      },
    ],
  } as unknown as ApiModel;

  it('two operations that camel-case alike get distinct methods — PHP fatals on a redeclare', () => {
    const out = phpGenerator({
      model: colliding,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(out).toContain('public function getUser(string $id');
    expect(out).toContain('public function getUser2(string $name');
  });

  it('the code sample names the deduped method, not the raw one', () => {
    const sample = phpSample(colliding.services[0].operations[1], {
      model: colliding,
      outputPath: '/out/client.ts',
      emit: {},
    });
    expect(sample?.source).toContain('$client->getUser2(');
  });
});

describe('phpGenerator runtime: module', () => {
  it('requires runtime.php beside the client and rewrites its namespace to match', () => {
    const files = phpGenerator({
      model: CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { runtime: 'module' },
    });
    const entry = files.find((file) => file.path === '/out/client.php')!.content;
    expect(entry).toContain("require_once __DIR__ . '/runtime.php';");
    expect(entry).not.toContain('// ─── Embedded runtime');
    const runtime = files.find((file) => file.path === '/out/runtime.php')!.content;
    expect(runtime).toContain('namespace CafeOrdersApi;');
    expect(runtime).not.toContain('namespace RedoclyClientRuntime;');
    expect(runtime).toContain('// Generated by @redocly/client-generator');
  });
});

describe('phpGenerator (full client assembly)', () => {
  it('assembles one runnable file: namespace, models, embedded runtime, operations, Client', () => {
    const out = generatePhp();
    expect(out.startsWith('<?php')).toBe(true);
    expect(out).toContain('namespace CafeOrdersApi;');
    expect(out).toContain('const OPERATIONS = [');
    // Not final: PHP suites mock concrete classes (createMock(Client::class)).
    expect(out).toContain('\nclass Client');
    expect(out).not.toContain('final class Client');
    expect(out).toContain('public function __construct(private Config $config)');
    expect(out).toContain(
      'public function getOrder(string $orderId, ?array $headers = null): Order'
    );
    expect(out).toContain('throw apiErrorFrom($response);');
    expect(out).toContain('Order::fromArray(decodeJson($response))');
    expect((out.match(/namespace CafeOrdersApi;/g) ?? []).length).toBe(1);
    expectPhpRuns(out);
  });

  it('paginated operations gain Pages/Items generators; SSE and multipart route through the runtime', () => {
    const out = generatePhp();
    expect(out).toContain('public function listOrdersPages(');
    expect(out).toContain('public function listOrdersItems(');
    expect(out).toContain('iterPages($call,');
    expect(out).toContain('yield OrderPage::fromArray($page);');
    expect(out).toContain('public function streamEvents(?array $headers = null): \\Generator');
    expect(out).toContain('yield from iterSse($open,');
    expect(out).toContain('toMultipart($body)');
    expectPhpRuns(out);
  });

  it('returns the raw body string for non-JSON success responses (PDF download)', () => {
    const out = generatePhp();
    expect(out).toContain(
      'public function getOrderPdf(string $orderId, ?array $headers = null): string'
    );
    expect(out).toContain("return $response['body'];");
  });

  it('documents element types PHP cannot express in the signature', () => {
    // A bare-array collection: `array` in the signature, element type in the docblock.
    const collection: ApiModel = {
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
              queryParams: [{ name: 'cursor', in: 'query', required: false, schema: STRING }],
              headerParams: [],
              cookieParams: [],
              security: [],
              paginationExtension: { style: 'link', items: '' },
              successResponseHeaders: [{ name: 'link', schema: STRING }],
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
          schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
        },
      ],
      securitySchemes: [],
    } as unknown as ApiModel;

    const out = phpGenerator({
      model: collection,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;

    expect(out).toContain('@return Order[]');
    // Iterators say what they yield, so static analysis can follow them.
    expect(out).toContain('@return \\Generator<int, array>');
    expect(out).toContain('@return \\Generator<int, Order>');
    expectPhpRuns(out);
  });

  it('emits a WithHeaders envelope variant only for ops with declared response headers', () => {
    const out = generatePhp();
    expect(out).toContain('public function listOrdersWithHeaders(');
    expect(out).toContain(
      "readEnvelopeHeaders($response, [['pagination-total', 'paginationTotal', 'integer'], ['link', 'link', 'string']])"
    );
    expect(out).toContain("status: $response['status']");
    // No declared headers, no variant.
    expect(out).not.toContain('getOrderWithHeaders');
    expectPhpRuns(out);
  });

  it('puts the brace on the line after a declaration, with no blank line between', () => {
    const out = renderPhpModels(
      model({
        Status: { kind: 'enum', values: ['open'], scalar: 'string' },
        Order: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
      })
    );
    expect(out).toContain('final class Order\n{');
    expect(out).toContain('enum Status: string\n{');
    expect(out).toContain('public static function fromArray(array $data): self\n    {');
    expect(out).not.toMatch(/\n\n\s*\{/);
    expectModelsRun(out);
  });

  it('a bare date-time success body hydrates to the DateTimeImmutable its signature declares', () => {
    // The top-level hydration call dropped `dateType`, so the method returned the raw
    // string while its own return type said `\\DateTimeImmutable`.
    const dated: ApiModel = {
      title: 'Cafe',
      version: '1.0.0',
      serverUrl: 'https://api.cafe.example',
      schemas: [],
      securitySchemes: [],
      services: [
        {
          name: 'Default',
          operations: [
            {
              name: 'getDeadline',
              specName: 'getDeadline',
              method: 'get',
              path: '/deadline',
              tags: [],
              pathParams: [],
              queryParams: [],
              headerParams: [],
              cookieParams: [],
              security: [],
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              ],
              errorResponses: [],
            },
          ],
        },
      ],
    } as unknown as ApiModel;
    const out = phpGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;
    expect(out).toContain(
      'public function getDeadline(?array $headers = null): \\DateTimeImmutable'
    );
    expect(out).toContain('new \\DateTimeImmutable(decodeJson($response))');
  });

  it('maps date/date-time to DateTimeImmutable under dateType: Date, hydrating both ways', () => {
    const DATE_TIME: SchemaModel = {
      kind: 'scalar',
      scalar: 'string',
      metadata: { format: 'date-time' },
    };
    const DATE: SchemaModel = { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } };
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
              queryParams: [{ name: 'since', in: 'query', required: false, schema: DATE_TIME }],
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
          ],
        },
      ],
      schemas: [
        {
          name: 'Order',
          schema: {
            kind: 'object',
            properties: [
              { name: 'placedAt', schema: DATE_TIME, required: true },
              { name: 'dueDate', schema: DATE, required: false },
              { name: 'reminders', schema: { kind: 'array', items: DATE_TIME }, required: false },
            ],
          },
        },
      ],
      securitySchemes: [],
    } as unknown as ApiModel;

    const out = phpGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;

    expect(out).toContain('public \\DateTimeImmutable $placedAt');
    expect(out).toContain('public ?\\DateTimeImmutable $dueDate = null');
    // Hydration and serialization both convert, including inside arrays.
    expect(out).toContain("new \\DateTimeImmutable($data['placedAt'])");
    expect(out).toContain(
      "array_map(static fn ($item) => new \\DateTimeImmutable($item), $data['reminders'])"
    );
    expect(out).toContain('$this->placedAt->format(\\DateTimeInterface::ATOM)');
    expect(out).toContain("$this->dueDate->format('Y-m-d')");
    expect(out).toContain('?\\DateTimeImmutable $since = null');
    expectPhpRuns(out);

    // The default keeps the wire representation.
    const asString = phpGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(asString).toContain('public string $placedAt');
  });

  it('bakes the serverUrl option, not just the description server', () => {
    const files = phpGenerator({
      model: CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { serverUrl: 'https://override.example' },
    });
    expect(files[0].content).toContain("$this->config->serverUrl = 'https://override.example';");
  });

  it('emits a Servers class with named variable arguments defaulting to the spec defaults', () => {
    const out = generatePhp();
    expect(out).toContain('final class Servers');
    expect(out).toContain(
      "public static function liveServer(string $organizationId = 'unknown'): string"
    );
    expect(out).toContain(
      "public static function sandboxServer(string $organizationId = 'unknown'): string"
    );
    expect(out).toContain("return 'https://api.cafe.example/organizations/' . $organizationId;");
    expectPhpRuns(out);
  });
});
