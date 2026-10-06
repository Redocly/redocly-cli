import { BaseResolver, createConfig, ResolveError, type Config } from '@redocly/openapi-core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectEmbeddedInputs, isApiDescription } from '../descriptions.js';
import { captureLogger } from './capture-logger.js';

const dirs: string[] = [];
let output: { stderr: string[]; stdout: string[] };

beforeEach(() => {
  output = captureLogger();
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'recheck-descriptions-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

function configIn(dir: string): Promise<Config> {
  return createConfig({}, { configPath: join(dir, 'redocly.yaml') });
}

const ROOT = outdent`
  openapi: 3.1.0
  info:
    title: Cafe
    version: 1.0.0
    description: |
      Welcome to the cafe.
      Order a coffee first.
  paths:
    /orders:
      post:
        summary: Place an order
        description: Creates an order.
        responses:
          '200':
            description: The order.
            content:
              application/json:
                schema:
                  $ref: ./schemas.yaml#/Order
      get:
        responses:
          '200':
            description: Orders.
            content:
              application/json:
                schema:
                  $ref: ./schemas.yaml#/Order
`;

const SCHEMAS = outdent`
  Order:
    type: object
    description: An order for one drink.
    properties:
      id:
        type: string
        description: The order id.
`;

describe('isApiDescription', () => {
  it.each([
    ['an API description', 'openapi.yaml', ROOT, true],
    ['an API description with an upper-case extension', 'openapi.YAML', ROOT, true],
    ['a YAML file that does not parse', 'broken.yaml', 'title: [t', true],
    ['a YAML file that is not an API description', 'notes.yaml', 'title: Notes', false],
    ['a Markdown file', 'index.md', '# Cafe', false],
  ])('returns the right answer for %s', async (_case, name, content, expected) => {
    const dir = fixture({ [name]: content });
    expect(await isApiDescription(join(dir, name), new BaseResolver())).toBe(expected);
  });

  it('returns true for a YAML file that exists but cannot be read', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT });
    const resolver = new BaseResolver();
    vi.spyOn(resolver, 'loadExternalRef').mockRejectedValue(
      new ResolveError(new Error('EACCES: permission denied'))
    );
    expect(await isApiDescription(join(dir, 'openapi.yaml'), resolver)).toBe(true);
  });

  it.each([
    ['a missing file', 'missing.yaml'],
    ['a folder', 'folder.yaml'],
  ])('returns false for %s', async (_case, name) => {
    const dir = fixture({});
    mkdirSync(join(dir, 'folder.yaml'));
    expect(await isApiDescription(join(dir, name), new BaseResolver())).toBe(false);
  });
});

describe('collectEmbeddedInputs', () => {
  it('collects every string description, but not summary, with its pointer and owning file', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const { inputs } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    const root = join(dir, 'openapi.yaml');
    const schemas = join(dir, 'schemas.yaml');
    expect(
      new Map(inputs.map((input) => [`${input.file}${input.pointer}`, input.content]))
    ).toEqual(
      new Map([
        [`${root}#/info/description`, 'Welcome to the cafe.\nOrder a coffee first.\n'],
        [`${root}#/paths/~1orders/post/description`, 'Creates an order.'],
        [`${root}#/paths/~1orders/post/responses/200/description`, 'The order.'],
        [`${root}#/paths/~1orders/get/responses/200/description`, 'Orders.'],
        [`${schemas}#/Order/description`, 'An order for one drink.'],
        [`${schemas}#/Order/properties/id/description`, 'The order id.'],
      ])
    );
  });

  // The walker visits a node once per type, so only refs of two types reach it twice.
  it('collects a $ref target once when refs of two node types point at it', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
        paths:
          /orders:
            get:
              parameters:
                - $ref: '#/components/parameters/OrderId'
              responses:
                '200':
                  description: The order.
                  headers:
                    Order-Id:
                      $ref: '#/components/parameters/OrderId'
        components:
          parameters:
            OrderId:
              name: Order-Id
              in: header
              description: The order id.
              schema:
                type: string
      `,
    });
    const { inputs } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    const orderId = inputs.filter(
      (input) => input.pointer === '#/components/parameters/OrderId/description'
    );
    expect(orderId).toHaveLength(1);
  });

  it('reads a $ref file that two APIs share once and collects its descriptions once', async () => {
    const dir = fixture({ 'a.yaml': ROOT, 'b.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const resolver = new BaseResolver();
    const load = vi.spyOn(resolver, 'loadExternalRef');
    const { inputs, apiFiles } = await collectEmbeddedInputs(
      [join(dir, 'a.yaml'), join(dir, 'b.yaml')],
      await configIn(dir),
      resolver
    );
    const schemaLoads = load.mock.calls.filter(([file]) => file === join(dir, 'schemas.yaml'));
    expect(schemaLoads).toHaveLength(1);
    const schemaInputs = inputs.filter((input) => input.file === join(dir, 'schemas.yaml'));
    expect(schemaInputs).toHaveLength(2);
    expect(apiFiles).toEqual([join(dir, 'a.yaml'), join(dir, 'schemas.yaml'), join(dir, 'b.yaml')]);
  });

  it('fails an API whose local $ref target is missing and marks both files unreadable', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
          description: Welcome to the cafe.
        paths: {}
        components:
          schemas:
            MenuItem:
              $ref: './missing.yaml#/MenuItem'
      `,
    });
    const result = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    const root = join(dir, 'openapi.yaml');
    expect(result.failureCount).toBe(1);
    expect(result.inputs).toEqual([]);
    expect(result.unreadableFiles).toEqual([root, join(dir, 'missing.yaml')]);
    expect(output.stderr).toEqual([
      `Could not read API description ${root}: Could not resolve $ref ./missing.yaml#/MenuItem from ${root}: ENOENT: no such file or directory '${join(dir, 'missing.yaml')}'\n`,
    ]);
  });

  it('names the file with the missing pointer at the end of a $ref chain', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
        paths: {}
        components:
          schemas:
            MenuItem:
              $ref: './b.yaml#/Foo'
      `,
      'b.yaml': outdent`
        Foo:
          $ref: './c.yaml#/Bar'
      `,
      'c.yaml': outdent`
        Other:
          type: string
      `,
    });
    const { failureCount } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    expect(failureCount).toBe(0);
    expect(output.stderr).toEqual([
      `Could not resolve $ref ./b.yaml#/Foo from ${join(dir, 'openapi.yaml')}: a pointer is missing in ${join(dir, 'c.yaml')}; its descriptions are skipped.\n`,
    ]);
  });

  // The walker reports a $ref chain as one $ref with the error of its last hop.
  it('names the broken file at the end of a $ref chain', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
        paths: {}
        components:
          schemas:
            MenuItem:
              $ref: './b.yaml#/Foo'
      `,
      'b.yaml': outdent`
        Foo:
          $ref: './c.yaml#/Bar'
      `,
      'c.yaml': 'title: [t',
    });
    const { failureCount, unreadableFiles } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    expect(failureCount).toBe(1);
    expect(unreadableFiles).toEqual([
      join(dir, 'openapi.yaml'),
      join(dir, 'b.yaml'),
      join(dir, 'c.yaml'),
    ]);
    const [message] = output.stderr;
    expect(message).toContain(
      `Could not resolve $ref ./b.yaml#/Foo from ${join(dir, 'openapi.yaml')}`
    );
    expect(message).toContain(join(dir, 'c.yaml'));
  });

  it('keeps the descriptions and warns once when an external file loads but its pointer is missing', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
          description: Welcome to the cafe.
        paths:
          /orders:
            get:
              description: Lists the orders.
              responses:
                '200':
                  description: Orders.
                  content:
                    application/json:
                      schema:
                        $ref: ./schemas.yaml#/Missing
                '201':
                  description: Created.
                  content:
                    application/json:
                      schema:
                        $ref: ./schemas.yaml#/Missing
      `,
      'schemas.yaml': SCHEMAS,
    });
    const { inputs, apiFiles, failureCount } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    expect(failureCount).toBe(0);
    expect(inputs.map((input) => input.pointer)).toEqual([
      '#/info/description',
      '#/paths/~1orders/get/description',
      '#/paths/~1orders/get/responses/200/description',
      '#/paths/~1orders/get/responses/201/description',
    ]);
    const warnings = output.stderr.filter((line) => line.includes('./schemas.yaml#/Missing'));
    expect(warnings).toHaveLength(1);
    expect(apiFiles).toEqual([join(dir, 'openapi.yaml'), join(dir, 'schemas.yaml')]);
  });

  it('names the unread target by the same split the walker uses when the file name has a hash', async () => {
    const dir = fixture({
      'openapi.yaml': outdent`
        openapi: 3.1.0
        info:
          title: Cafe
          version: 1.0.0
        paths: {}
        components:
          schemas:
            MenuItem:
              $ref: './data#v2.yaml#/MenuItem'
      `,
    });
    const { unreadableFiles } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    expect(unreadableFiles).toEqual([join(dir, 'openapi.yaml'), join(dir, 'data#v2.yaml')]);
  });

  it('keeps a remote file out of the API files when a local $ref chains into it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(outdent`
        Order:
          type: object
          description: An order for one drink.
      `)
    );
    const dir = fixture({
      'openapi.yaml': ROOT,
      'schemas.yaml': outdent`
        Order:
          $ref: https://example.com/schemas.yaml#/Order
      `,
    });
    const { apiFiles, failureCount } = await collectEmbeddedInputs(
      [join(dir, 'openapi.yaml')],
      await configIn(dir),
      new BaseResolver()
    );
    expect(failureCount).toBe(0);
    expect(apiFiles).toEqual([join(dir, 'openapi.yaml')]);
  });

  it('skips a remote API without reading it', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const dir = fixture({});
    const { inputs, failureCount } = await collectEmbeddedInputs(
      ['https://example.com/openapi.yaml'],
      await configIn(dir),
      new BaseResolver()
    );
    expect(inputs).toEqual([]);
    expect(failureCount).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(output.stderr).toEqual([
      'Skipped remote API description https://example.com/openapi.yaml; only local files are linted.\n',
    ]);
  });
});
