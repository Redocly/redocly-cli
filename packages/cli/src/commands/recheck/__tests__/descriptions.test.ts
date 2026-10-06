import { createConfig } from '@redocly/openapi-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';
import { afterEach, describe, expect, it } from 'vitest';

import { collectDescriptions, UnresolvedRefError } from '../descriptions.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'recheck-descriptions-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
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

describe('collectDescriptions', () => {
  it('collects every string description, but not summary, with its pointer and owning source', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const root = join(dir, 'openapi.yaml');
    const schemas = join(dir, 'schemas.yaml');
    expect(
      new Map(
        descriptions.map((entry) => [`${entry.source.absoluteRef}${entry.pointer}`, entry.text])
      )
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
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const orderId = descriptions.filter(
      (entry) => entry.pointer === '#/components/parameters/OrderId/description'
    );
    expect(orderId).toHaveLength(1);
  });

  it('returns the root document and every local $ref source as scanned files', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { files } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    expect(files).toContain(join(dir, 'openapi.yaml'));
    expect(files).toContain(join(dir, 'schemas.yaml'));
  });

  it('rejects a root whose local $ref target is missing', async () => {
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
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const failure = await collectDescriptions(join(dir, 'openapi.yaml'), config).catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(UnresolvedRefError);
    expect((failure as UnresolvedRefError).message).toContain('missing.yaml');
    expect((failure as UnresolvedRefError).files).toEqual([join(dir, 'missing.yaml')]);
  });

  it('keeps the descriptions when an external file loads but its pointer is missing', async () => {
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
      `,
      'schemas.yaml': SCHEMAS,
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions, unresolvedPointers, files } = await collectDescriptions(
      join(dir, 'openapi.yaml'),
      config
    );
    expect(descriptions.map((entry) => entry.pointer)).toEqual([
      '#/info/description',
      '#/paths/~1orders/get/description',
      '#/paths/~1orders/get/responses/200/description',
    ]);
    expect(unresolvedPointers).toHaveLength(1);
    expect(unresolvedPointers[0]).toContain('./schemas.yaml#/Missing');
    expect(files).toEqual([join(dir, 'openapi.yaml'), join(dir, 'schemas.yaml')]);
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
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const failure = await collectDescriptions(join(dir, 'openapi.yaml'), config).catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(UnresolvedRefError);
    expect((failure as UnresolvedRefError).files).toEqual([join(dir, 'data#v2.yaml')]);
  });
});
