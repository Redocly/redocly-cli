import { outdent } from 'outdent';

import { resolverWithFiles } from '../../../__tests__/utils.js';
import { isRef } from '../../ref-utils.js';
import type { NodeEntry } from '../types.js';
import { buildTree, cafe, nodeAt } from './utils.js';

function refsIn(node: NodeEntry, seen = new Set<NodeEntry>()): NodeEntry[] {
  if (seen.has(node)) return [];
  seen.add(node);
  const reached = node.resolved ? [...node.children, node.resolved] : node.children;
  return [...(isRef(node.value) ? [node] : []), ...reached.flatMap((child) => refsIn(child, seen))];
}

describe('buildNodeTree', () => {
  it('should record a node with its type, key and value under the node it is written in', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters:
                - { name: limit, in: query }
      `)
    );

    expect(nodeAt(root, '#/paths/~1menu/get/parameters/0')).toMatchObject({
      type: { name: 'Parameter' },
      key: 0,
      value: { name: 'limit', in: 'query' },
      parent: nodeAt(root, '#/paths/~1menu/get/parameters'),
    });
  });

  it('should make a $ref a node of the type its place expects, pointing at its target', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters:
                - { name: item, in: query, schema: { $ref: '#/components/schemas/MenuItem' } }
        components:
          schemas:
            MenuItem: { type: string }
      `)
    );

    expect(nodeAt(root, '#/paths/~1menu/get/parameters/0/schema')).toMatchObject({
      type: { name: 'Schema' },
      resolved: { location: { pointer: '#/components/schemas/MenuItem' } },
    });
  });

  it('should place a target where it is written, not under the $ref that reaches it first', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters:
                - { name: item, in: query, schema: { $ref: '#/components/schemas/MenuItem' } }
        components:
          schemas:
            MenuItem: { type: string }
      `)
    );

    expect(nodeAt(root, '#/components/schemas/MenuItem')).toMatchObject({
      key: 'MenuItem',
      parent: nodeAt(root, '#/components/schemas'),
    });
  });

  it('should place a target where it is written when a $ref before it in the same map reaches it first', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths: {}
        components:
          schemas:
            Receipt: { $ref: '#/components/schemas/Order' }
            Order: { type: object }
      `)
    );

    expect(nodeAt(root, '#/components/schemas/Order')).toMatchObject({
      key: 'Order',
      parent: nodeAt(root, '#/components/schemas'),
    });
  });

  it('should place a node inside a component where it is written when a $ref reaches it first', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /orders:
            get:
              parameters:
                - { name: total, in: query, schema: { $ref: '#/components/schemas/Order/properties/total' } }
        components:
          schemas:
            Order:
              properties:
                total: { type: number }
      `)
    );

    expect(nodeAt(root, '#/components/schemas/Order/properties/total')).toMatchObject({
      key: 'total',
      parent: nodeAt(root, '#/components/schemas/Order/properties'),
    });
  });

  it('should leave a $ref that does not resolve without a target and report it', async () => {
    const { root, problems } = await buildTree(
      cafe(outdent`
        paths:
          /menu:
            get:
              parameters:
                - { name: item, in: query, schema: { $ref: '#/components/schemas/Dessert' } }
      `)
    );
    const dessertRef = '#/paths/~1menu/get/parameters/0/schema';

    expect(nodeAt(root, dessertRef)!.resolved).toBeUndefined();
    expect(problems).toMatchObject([
      { ruleId: 'no-unresolved-refs', location: [{ pointer: dessertRef }] },
    ]);
  });

  it('should keep a target in another file without a parent, named by the $ref that reaches it', async () => {
    const externalRefResolver = resolverWithFiles({ 'menu.yaml': 'get: {}' });

    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu: { $ref: menu.yaml }
      `),
      externalRefResolver
    );

    const menuRef = nodeAt(root, '#/paths/~1menu')!;
    expect(menuRef.resolved).toMatchObject({ key: '/menu', parent: null });
    expect(menuRef.resolved!.referencedFrom).toBe(menuRef);
  });

  it('should give the root no way up when a $ref inside it points at it', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths: {}
        components:
          schemas:
            Everything: { $ref: '#/' }
      `)
    );

    expect(root.referencedFrom).toBeUndefined();
  });

  it('should link every $ref that meets its target before the target is built', async () => {
    const externalRefResolver = resolverWithFiles({
      'menu.yaml': '{ $ref: ./item.yaml, summary: Menu }',
      'item.yaml': outdent`
        get:
          callbacks:
            onEvent:
              '{$request.body#/url}': { $ref: ./menu.yaml }
      `,
    });

    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu: { $ref: ./menu.yaml }
          /other: { $ref: ./item.yaml }
      `),
      externalRefResolver
    );

    const refs = refsIn(root);
    expect(refs).toHaveLength(4);
    expect(refs.filter((ref) => !ref.resolved).map((ref) => ref.location.pointer)).toEqual([]);
  });

  it('should record the keys written next to a $ref under that $ref', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths: {}
        components:
          schemas:
            Drink: { type: object }
            Coffee:
              $ref: '#/components/schemas/Drink'
              properties:
                roast: { type: string }
      `)
    );

    expect(nodeAt(root, '#/components/schemas/Coffee')!.children).toMatchObject([
      { key: 'properties' },
    ]);
  });

  it('should point a $ref at a $ref with keys written next to it, not at the end of the chain', async () => {
    const { root } = await buildTree(
      cafe(outdent`
        paths: {}
        components:
          schemas:
            DailySpecial: { $ref: '#/components/schemas/Latte' }
            Latte: { $ref: '#/components/schemas/Coffee', description: Coffee with milk }
            Coffee: { type: object }
      `)
    );

    expect(nodeAt(root, '#/components/schemas/DailySpecial')!.resolved).toBe(
      nodeAt(root, '#/components/schemas/Latte')
    );
  });
});
