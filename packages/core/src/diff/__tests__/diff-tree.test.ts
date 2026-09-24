import { outdent } from 'outdent';

import { buildDiffTree } from '../diff-tree.js';
import { oas3Identities } from '../specs/oas3.js';
import { nodeTreeOf } from './utils.js';

const cafe = (body: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  ${body}
`;

describe('buildDiffTree', () => {
  it('should label a path by its shape and a path parameter by its place in the template', async () => {
    const { root } = await nodeTreeOf(
      cafe(outdent`
        paths:
          /orders/{orderId}/items/{itemId}:
            get:
              parameters:
                - { name: itemId, in: path, required: true }
                - { name: orderId, in: path, required: true }
                - { name: fields, in: query }
              responses: {}
      `)
    );
    const { diffNodeOf } = buildDiffTree(root, root, oas3Identities);
    const labels = [...new Set(diffNodeOf.values())].map((node) => node.label);

    const parameterLabels = labels.filter((label) => label.includes('/parameters/'));

    expect(parameterLabels).toMatchInlineSnapshot(`
      [
        "#/paths/~1orders~1{0}~1items~1{1}/get/parameters/{path:1}",
        "#/paths/~1orders~1{0}~1items~1{1}/get/parameters/{path:0}",
        "#/paths/~1orders~1{0}~1items~1{1}/get/parameters/{query:fields}",
      ]
    `);
  });

  it('should keep a callback key as it is and label a path parameter there by its name', async () => {
    const { root } = await nodeTreeOf(
      cafe(outdent`
        paths:
          /orders:
            post:
              responses: {}
              callbacks:
                orderReady:
                  '{$request.body#/callbackUrl}':
                    post:
                      parameters:
                        - { name: orderId, in: path, required: true }
                      responses: {}
      `)
    );
    const { diffNodeOf } = buildDiffTree(root, root, oas3Identities);
    const labels = [...new Set(diffNodeOf.values())].map((node) => node.label);

    const parameterLabels = labels.filter((label) => label.includes('/parameters/'));

    expect(parameterLabels).toMatchInlineSnapshot(`
      [
        "#/paths/~1orders/post/callbacks/orderReady/{$request.body#~1callbackUrl}/post/parameters/{path:orderId}",
      ]
    `);
  });

  it('should label servers by url, tags by name and security requirements by scheme names', async () => {
    const { root } = await nodeTreeOf(
      cafe(outdent`
        servers:
          - url: https://api.cafe.example
        tags:
          - name: Orders
        security:
          - OAuth: [orders:read]
            ApiKey: []
        paths: {}
      `)
    );
    const { diffNodeOf } = buildDiffTree(root, root, oas3Identities);
    const labels = [...new Set(diffNodeOf.values())].map((node) => node.label);

    const identifiedLabels = labels.filter((label) => /\/(servers|tags|security)\//.test(label));

    expect(identifiedLabels).toMatchInlineSnapshot(`
      [
        "#/servers/{https:~1~1api.cafe.example}",
        "#/security/{ApiKey+OAuth}",
        "#/tags/{Orders}",
      ]
    `);
  });

  it('should match a referenced list item by what it points at, wherever it is listed', async () => {
    const menu = (parameters: string) =>
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters: ${parameters}
              responses: {}
        components:
          schemas:
            Sort: { name: sort, in: query }
            Filter: { name: filter, in: query }
      `);

    const base = await nodeTreeOf(
      menu("[{ $ref: '#/components/schemas/Sort' }, { $ref: '#/components/schemas/Filter' }]")
    );
    const revision = await nodeTreeOf(
      menu("[{ $ref: '#/components/schemas/Filter' }, { $ref: '#/components/schemas/Sort' }]")
    );
    const { diffNodeOf } = buildDiffTree(base.root, revision.root, oas3Identities);
    const nodes = new Map([...diffNodeOf.values()].map((node) => [node.label, node]));
    const sort = nodes.get('#/paths/~1menu/get/parameters/{query:sort}')!;
    const filter = nodes.get('#/paths/~1menu/get/parameters/{query:filter}')!;

    expect(sort.base?.key).toBe(0);
    expect(sort.revision?.key).toBe(1);
    expect(filter.base?.key).toBe(1);
    expect(filter.revision?.key).toBe(0);
  });

  it('should match items that share an identity in document order and number the extra one', async () => {
    const menu = (parameters: string) =>
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters: ${parameters}
              responses: {}
      `);

    const base = await nodeTreeOf(
      menu('[{ name: search, in: query }, { name: search, in: query, required: true }]')
    );
    const revision = await nodeTreeOf(menu('[{ name: search, in: query }]'));
    const { diffNodeOf } = buildDiffTree(base.root, revision.root, oas3Identities);
    const nodes = new Map([...diffNodeOf.values()].map((node) => [node.label, node]));
    const first = nodes.get('#/paths/~1menu/get/parameters/{query:search}')!;
    const second = nodes.get('#/paths/~1menu/get/parameters/{query:search}#2')!;

    expect(first.base?.key).toBe(0);
    expect(first.revision?.key).toBe(0);
    expect(second.base?.key).toBe(1);
    expect(second.revision).toBeUndefined();
  });
});
