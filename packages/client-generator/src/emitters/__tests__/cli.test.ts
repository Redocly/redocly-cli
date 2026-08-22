import { logger } from '@redocly/openapi-core';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { commandData, renderCliModule, renderComposedCliEntry } from '../cli.js';
import { resolveModelPagination } from '../pagination.js';

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };
const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

const MODEL: ApiModel = {
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
          summary: 'List orders.',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: { kind: 'enum', values: ['open', 'closed'], scalar: 'string' },
            },
            { name: 'pageSize', in: 'query', required: false, schema: INT },
            {
              name: 'tag',
              in: 'query',
              required: false,
              schema: { kind: 'array', items: STRING },
            },
            { name: 'cursor', in: 'query', required: false, schema: STRING },
          ],
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
          name: 'downloadReport',
          specName: 'downloadReport',
          method: 'get',
          path: '/report',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            { status: '200', contentType: 'application/octet-stream', schema: { kind: 'unknown' } },
          ],
          errorResponses: [],
        },
      ],
    },
    {
      name: 'Default',
      operations: [
        {
          name: 'ping',
          specName: 'ping',
          method: 'get',
          path: '/ping',
          tags: [],
          pathParams: [],
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

describe('commandData', () => {
  it('derives groups from tags, flags from query params, and positionals in path order', () => {
    const commands = commandData(MODEL, { pagination: resolveModelPagination(MODEL, undefined) });
    const list = commands.find((command) => command.name === 'listOrders');
    expect(list).toMatchObject({
      group: 'Orders',
      summary: 'List orders.',
      paginated: true,
      flags: [
        { name: 'status', param: 'status', type: 'string', enum: ['open', 'closed'] },
        { name: 'page-size', param: 'pageSize', type: 'number' },
        { name: 'tag', param: 'tag', type: 'array' },
        { name: 'cursor', param: 'cursor', type: 'string' },
      ],
    });
    expect(commands.find((command) => command.name === 'getOrder')).toMatchObject({
      positionals: [{ name: 'orderId' }],
    });
    // Untagged operations are flat: no group.
    expect(commands.find((command) => command.name === 'ping')?.group).toBeUndefined();
  });

  it('marks bodies, SSE, and blob operations, and stores IR schemas verbatim', () => {
    const commands = commandData(MODEL, {});
    expect(commands.find((command) => command.name === 'createOrder')).toMatchObject({
      body: { required: true },
      schemas: {
        request: { kind: 'ref', name: 'Order' },
        response: { kind: 'ref', name: 'Order' },
      },
    });
    expect(commands.find((command) => command.name === 'streamEvents')?.sse).toBe(true);
    expect(commands.find((command) => command.name === 'downloadReport')?.blob).toBe(true);
  });
});

describe('renderCliModule', () => {
  const options = {
    stem: 'client',
    importExt: 'js',
    runtime: 'inline' as const,
    zodSelected: false,
  };

  it('emits a shebang entry that wires node bindings and embeds the cli runtime inline', () => {
    const out = renderCliModule(MODEL, options);
    expect(out.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(out).toContain('function parseInvocation'); // embedded runtime
    expect(out).toContain('import { client, configure } from "./client.js";');
    expect(out).toContain('schemes: [{"key":"BearerAuth","kind":"bearer"}]');
    // A library as well as a binary: the exports composition imports, and an entry
    // guard so importing the module never executes the CLI.
    expect(out).toContain('export const COMMANDS: CliCommand[]');
    expect(out).toContain('export const wiring: CliWiring');
    expect(out).toContain('export const run =');
    expect(out).toContain(
      'realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])'
    );
    expect(out).not.toContain('from "@redocly/client-generator"');
  });

  it('package mode imports runCli from the package; zod co-selection wires validation', () => {
    const out = renderCliModule(MODEL, { ...options, runtime: 'package', zodSelected: true });
    expect(out).toContain(
      'import { invokedName, runCli, type CliCommand, type CliWiring } from "@redocly/client-generator";'
    );
    expect(out).not.toContain('function parseInvocation');
    expect(out).toContain('import { zodValidation } from "./client.zod.js";');
    expect(out).toContain(
      'use(zodValidation(process.argv.includes("--dry-run") ? { response: false } : {}));'
    );
  });

  /** `orders` is the slug of the `Orders` tag, so an operation of that name collides. */
  function modelWithOperationNamedOrders(tags: string[]): ApiModel {
    const [service] = MODEL.services;
    return {
      ...MODEL,
      services: [
        {
          ...service,
          operations: service.operations.map((op) =>
            op.name === 'getOrder' ? { ...op, name: 'orders', tags } : op
          ),
        },
      ],
    };
  }

  it('warns when an operation is named after a tag, naming how it resolves', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    renderCliModule(modelWithOperationNamedOrders(['Reports']), options);
    expect(warn.mock.lastCall?.[0]).toContain('orders (run it as "reports orders")');

    renderCliModule(modelWithOperationNamedOrders([]), options);
    expect(warn.mock.lastCall?.[0]).toContain('orders (keeps the bare word');

    renderCliModule(MODEL, options);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('the package-mode import line', () => {
  it('names only values the package root exports', async () => {
    // The emitted entry is the only consumer of these names, and a missing export breaks
    // every package-mode CLI at import time rather than at generation.
    const out = renderCliModule(MODEL, {
      stem: 'client',
      importExt: 'js',
      runtime: 'package',
      zodSelected: false,
    });
    const line = out
      .split('\n')
      .find((candidate) => candidate.includes('from "@redocly/client-generator"'));
    expect(line, 'no package import line found').toBeDefined();
    const names = line!
      .slice(line!.indexOf('{') + 1, line!.indexOf('}'))
      .split(',')
      .map((specifier) => specifier.trim())
      .filter((specifier) => specifier !== '' && !specifier.startsWith('type '));
    const root = (await import('../../index.js')) as Record<string, unknown>;
    for (const name of names) {
      expect(typeof root[name], `${name} is imported but not exported`).toBe('function');
    }
  });
});

describe('renderComposedCliEntry', () => {
  it('keeps import bindings legal for digit-leading aliases and unique for colliding ones', () => {
    const out = renderComposedCliEntry(
      [
        { alias: '2fa-api', modulePath: './2fa.cli.js' },
        { alias: 'my-api', modulePath: './my-api.cli.js' },
        { alias: 'my.api', modulePath: './my-api-2.cli.js' },
      ],
      'cafe'
    );
    expect(out).toContain('import { COMMANDS as _2fa_apiCommands');
    expect(out).toContain('COMMANDS as my_apiCommands');
    expect(out).toContain('COMMANDS as my_api_2Commands');
    expect(out).toContain('namespace: "2fa-api"');
  });
});
