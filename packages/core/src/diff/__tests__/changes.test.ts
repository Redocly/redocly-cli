import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../__tests__/utils.js';
import { collectChanges } from '../changes.js';
import { buildDiffTree } from '../diff-tree.js';
import { nodeTreeOf, treeOf } from './utils.js';

const cafe = (menuItem: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: {}
  components:
    schemas:
      MenuItem: ${menuItem}
`;

describe('collectChanges', () => {
  it('should report every property that differs, at its escaped pointer on each side', async () => {
    const base = await nodeTreeOf(
      cafe("{ type: integer, x-price/unit: cents, description: 'A drink' }")
    );
    const revision = await nodeTreeOf(
      cafe("{ type: number, x-price/unit: euros, description: 'A drink' }")
    );

    const changes = collectChanges(buildDiffTree(base.root, revision.root, {}).root);

    expect(replaceSourceWithRefInChanges(changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/components/schemas/MenuItem/type",
            "value": "integer",
          },
          "key": "#/components/schemas/MenuItem",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "api.yaml#/components/schemas/MenuItem/type",
            "value": "number",
          },
        },
        {
          "base": {
            "location": "api.yaml#/components/schemas/MenuItem/x-price~1unit",
            "value": "cents",
          },
          "key": "#/components/schemas/MenuItem",
          "kind": "modified",
          "property": "x-price/unit",
          "revision": {
            "location": "api.yaml#/components/schemas/MenuItem/x-price~1unit",
            "value": "euros",
          },
        },
      ]
    `);
  });

  it('should locate a property one side does not have at the node itself', async () => {
    const base = await nodeTreeOf(cafe('{ type: object }'));
    const revision = await nodeTreeOf(cafe('{ type: object, minProperties: 1 }'));

    const changes = collectChanges(buildDiffTree(base.root, revision.root, {}).root);

    expect(replaceSourceWithRefInChanges(changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/components/schemas/MenuItem",
            "value": undefined,
          },
          "key": "#/components/schemas/MenuItem",
          "kind": "modified",
          "property": "minProperties",
          "revision": {
            "location": "api.yaml#/components/schemas/MenuItem/minProperties",
            "value": 1,
          },
        },
      ]
    `);
  });

  it('should report a removed node once, with its whole value, and nothing below it', async () => {
    const base = await nodeTreeOf(cafe('{ properties: { price: { type: number, minimum: 0 } } }'));
    const revision = await nodeTreeOf(cafe('{ properties: {} }'));

    const changes = collectChanges(buildDiffTree(base.root, revision.root, {}).root);

    expect(replaceSourceWithRefInChanges(changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/components/schemas/MenuItem/properties/price",
            "value": {
              "minimum": 0,
              "type": "number",
            },
          },
          "key": "#/components/schemas/MenuItem/properties/price",
          "kind": "removed",
        },
      ]
    `);
  });

  it('should report a node of another type in the same place as a removal and an addition', () => {
    // The walker gives a place its type from the document, so the two sides can disagree.
    const base = treeOf(`
      #/ Root
      #/components Components
      #/components/examples NamedExamples
      #/components/examples/latte Example
    `);
    const revision = treeOf(`
      #/ Root
      #/components Components
      #/components/examples NamedExamples
      #/components/examples/latte Schema
    `);

    const changes = collectChanges(buildDiffTree(base.get('#/')!, revision.get('#/')!, {}).root);

    expect(replaceSourceWithRefInChanges(changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "tree.yaml#/components/examples/latte",
            "value": {},
          },
          "key": "#/components/examples/latte",
          "kind": "removed",
        },
        {
          "key": "#/components/examples/latte",
          "kind": "added",
          "revision": {
            "location": "tree.yaml#/components/examples/latte",
            "value": {},
          },
        },
      ]
    `);
  });

  it('should compare a $ref by where it points', async () => {
    const base = await nodeTreeOf(cafe("{ $ref: '#/components/schemas/Beverage' }"));
    const revision = await nodeTreeOf(cafe("{ $ref: '#/components/schemas/Dessert' }"));

    const changes = collectChanges(buildDiffTree(base.root, revision.root, {}).root);

    expect(replaceSourceWithRefInChanges(changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/components/schemas/MenuItem/$ref",
            "value": "#/components/schemas/Beverage",
          },
          "key": "#/components/schemas/MenuItem",
          "kind": "modified",
          "property": "$ref",
          "revision": {
            "location": "api.yaml#/components/schemas/MenuItem/$ref",
            "value": "#/components/schemas/Dessert",
          },
        },
      ]
    `);
  });

  it('should report nothing when the documents are the same', async () => {
    const { root } = await nodeTreeOf(cafe('{ type: string, enum: [coffee, tea] }'));

    const changes = collectChanges(buildDiffTree(root, root, {}).root);

    expect(changes).toEqual([]);
  });
});
