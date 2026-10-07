import * as path from 'node:path';
import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges, resolverWithFiles } from '../../../__tests__/utils.js';
import { pointerOf } from '../diff-node.js';
import { compareTrees } from '../diff-tree.js';
import { nodeTreeOf } from './utils.js';

const cafe = (body: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  ${body}
`;

describe('compareTrees', () => {
  const menu = (parameters: string) =>
    cafe(outdent`
      paths:
        /menu:
          get:
            parameters: ${parameters}
            responses: {}
    `);
  const compare = async (base: string, revision: string) =>
    compareTrees(await nodeTreeOf(base), await nodeTreeOf(revision));

  it('should compare each child with the child it pairs with', async () => {
    const changes = await compare(
      menu('[{ name: limit, in: query }, { name: offset, in: query }]'),
      menu('[{ name: offset, in: query }, { name: limit, in: query, description: How many }]')
    );

    expect(changes).toMatchObject([
      { key: '#/paths/~1menu/get/parameters/1', kind: 'modified', property: 'description' },
    ]);
  });

  it('should pair a map entry renamed to a similar key and report the key as changed', async () => {
    const changes = await compare(
      cafe('paths: { /order: { get: { responses: {} } } }'),
      cafe('paths: { /orders: { get: { responses: {} } } }')
    );

    expect(changes).toMatchObject([
      {
        key: '#/paths/~1orders',
        kind: 'modified',
        property: 'key',
        base: { value: '/order' },
        revision: { value: '/orders' },
      },
    ]);
  });

  it('should tell fixed fields from map entries by the node types', async () => {
    const changes = await compare(
      cafe(
        'paths: {}\ncomponents: { schemas: { Order: { unevaluatedProperties: { type: string } } } }'
      ),
      cafe('paths: {}\ncomponents: { schemas: { Order: { unevaluatedItems: { type: string } } } }')
    );

    expect(changes).toMatchObject([
      { key: '#/components/schemas/Order/unevaluatedProperties', kind: 'removed' },
      { key: '#/components/schemas/Order/unevaluatedItems', kind: 'added' },
    ]);
  });
});

describe('compareTrees through $refs', () => {
  const menu = (schema: string, schemas: string) =>
    cafe(outdent`
      paths:
        /menu:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: ${schema}
      components:
        schemas: ${schemas}
    `);
  const item = (nameType: string) =>
    `{ type: object, properties: { name: { type: ${nameType} } } }`;
  const itemRef = "{ $ref: '#/components/schemas/Item' }";
  const menuItemRef = "{ $ref: '#/components/schemas/MenuItem' }";

  // Each side has a folder of its own, so both roots reference their files by the same paths.
  async function nodeTreesOfFiles(sides: Record<'base' | 'revision', Record<string, string>>) {
    const load = (side: 'base' | 'revision') => {
      const files = Object.entries(sides[side]).map(([file, body]) => [
        path.join(side, file),
        body,
      ]);
      return nodeTreeOf(
        sides[side]['openapi.yaml'],
        path.resolve(side, 'openapi.yaml'),
        resolverWithFiles(Object.fromEntries(files))
      );
    };
    return { base: await load('base'), revision: await load('revision') };
  }

  it('should compare $refs to different targets by what the targets describe', async () => {
    const schemas = `{ Item: ${item('string')}, MenuItem: ${item('integer')} }`;
    const base = await nodeTreeOf(menu(itemRef, schemas));
    const revision = await nodeTreeOf(menu(menuItemRef, schemas));

    expect(replaceSourceWithRefInChanges(compareTrees(base, revision))).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/components/schemas/Item/properties/name/type",
            "value": "string",
          },
          "key": "#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/name",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "api.yaml#/components/schemas/MenuItem/properties/name/type",
            "value": "integer",
          },
        },
      ]
    `);
  });

  it('should find no change where an inline schema moved into a component that reads the same', async () => {
    const base = await nodeTreeOf(menu(item('string'), '{}'));
    const revision = await nodeTreeOf(menu(itemRef, `{ Item: ${item('string')} }`));

    expect(compareTrees(base, revision)).toMatchObject([
      { key: '#/components/schemas/Item', kind: 'added' },
    ]);
  });

  it('should compare a component that both documents reference under the place that references it', async () => {
    const base = await nodeTreeOf(menu(itemRef, `{ Item: ${item('string')} }`));
    const revision = await nodeTreeOf(menu(itemRef, `{ Item: ${item('integer')} }`));

    expect(compareTrees(base, revision).map((change) => change.key)).toEqual([
      '#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/name',
    ]);
  });

  it('should compare a pair of targets once, under the first place that references both', async () => {
    const orders = (ref: string) =>
      cafe(outdent`
        paths:
          /menu:
            get:
              responses:
                '200': { description: OK, content: { application/json: { schema: ${ref} } } }
            post:
              requestBody: { content: { application/json: { schema: ${ref} } } }
              responses: {}
        components:
          schemas: { Item: ${item('string')}, MenuItem: ${item('integer')} }
      `);
    const base = await nodeTreeOf(orders(itemRef));
    const revision = await nodeTreeOf(orders(menuItemRef));

    expect(compareTrees(base, revision).map((change) => change.key)).toEqual([
      '#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/name',
    ]);
  });

  it('should note the other places that reach a pair it has compared', async () => {
    const twoUses = (schemas: string) =>
      cafe(outdent`
        paths:
          /menu:
            get:
              responses:
                '200': { description: OK, content: { application/json: { schema: ${itemRef} } } }
            post:
              requestBody: { content: { application/json: { schema: ${itemRef} } } }
              responses: {}
        components:
          schemas: ${schemas}
      `);
    const base = await nodeTreeOf(twoUses(`{ Item: ${item('string')} }`));
    const revision = await nodeTreeOf(twoUses(`{ Item: ${item('integer')} }`));

    const [nameChanged] = compareTrees(base, revision);
    const itemPair = nameChanged.node.parent!.parent!;

    expect(pointerOf(itemPair)).toBe(
      '#/paths/~1menu/get/responses/200/content/application~1json/schema'
    );
    expect(itemPair.referencedBy.map(pointerOf)).toEqual([
      '#/paths/~1menu/post/requestBody/content/application~1json/schema',
      '#/components/schemas/Item',
    ]);
  });

  it('should end the comparison of components that reference themselves', async () => {
    const related = (name: string, description: string) =>
      `{ description: ${description}, properties: { related: { $ref: '#/components/schemas/${name}' } } }`;
    const schemas = `{ Item: ${related('Item', 'An item')}, MenuItem: ${related('MenuItem', 'A dish')} }`;
    const base = await nodeTreeOf(menu(itemRef, schemas));
    const revision = await nodeTreeOf(menu(menuItemRef, schemas));

    expect(compareTrees(base, revision)).toMatchObject([
      {
        key: '#/paths/~1menu/get/responses/200/content/application~1json/schema',
        kind: 'modified',
        property: 'description',
      },
    ]);
  });

  it('should locate a change in another file in the file of each side', async () => {
    const files = (nameType: string) => ({
      'openapi.yaml': menu('{ $ref: schemas/item.yaml }', '{}'),
      'schemas/item.yaml': item(nameType),
    });
    const { base, revision } = await nodeTreesOfFiles({
      base: files('string'),
      revision: files('integer'),
    });

    expect(compareTrees(base, revision)).toMatchObject([
      {
        key: '#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/name',
        kind: 'modified',
        property: 'type',
        base: {
          location: {
            source: { absoluteRef: path.resolve('base/schemas/item.yaml') },
            pointer: '#/properties/name/type',
          },
        },
        revision: {
          location: {
            source: { absoluteRef: path.resolve('revision/schemas/item.yaml') },
            pointer: '#/properties/name/type',
          },
        },
      },
    ]);
  });

  it('should match $refs to other files in a list by their files, in any order', async () => {
    const files = (oneOf: string) => ({
      'openapi.yaml': menu(`{ oneOf: ${oneOf} }`, '{}'),
      'coffee.yaml': '{ type: object, properties: { roast: { type: string } } }',
      'tea.yaml': '{ type: object, properties: { leaf: { type: integer } } }',
    });
    const { base, revision } = await nodeTreesOfFiles({
      base: files('[{ $ref: coffee.yaml }, { $ref: tea.yaml }]'),
      revision: files('[{ $ref: tea.yaml }, { $ref: coffee.yaml }]'),
    });

    expect(compareTrees(base, revision)).toEqual([]);
  });

  it('should compare the keys written next to a $ref at its place and its targets under $ref', async () => {
    const order = (ref: string, extraType: string) =>
      menu(
        `{ ${ref}, properties: { extra: { type: ${extraType} } } }`,
        `{ Item: ${item('string')}, MenuItem: ${item('integer')} }`
      );
    const base = await nodeTreeOf(order("$ref: '#/components/schemas/Item'", 'string'));
    const revision = await nodeTreeOf(order("$ref: '#/components/schemas/MenuItem'", 'integer'));

    expect(compareTrees(base, revision).map((change) => change.key)).toEqual([
      '#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/extra',
      '#/paths/~1menu/get/responses/200/content/application~1json/schema/$ref/properties/name',
    ]);
  });

  it('should keep a $ref on its pair and locate its changes in the target', async () => {
    const base = await nodeTreeOf(menu(itemRef, `{ Item: ${item('string')} }`));
    const revision = await nodeTreeOf(menu(itemRef, `{ Item: ${item('integer')} }`));

    const [nameChanged] = compareTrees(base, revision);
    const schemaPair = nameChanged.node.parent!.parent!;

    expect(schemaPair.revision).toMatchObject({
      value: { $ref: '#/components/schemas/Item' },
      resolved: { key: 'Item' },
    });
    expect(nameChanged).toMatchObject({
      key: '#/paths/~1menu/get/responses/200/content/application~1json/schema/properties/name',
      revision: { location: { pointer: '#/components/schemas/Item/properties/name/type' } },
    });
  });

  it('should compare a description added next to a $ref at the place, not the target against it', async () => {
    const schemas = `{ Item: ${item('string')} }`;
    const base = await nodeTreeOf(menu(itemRef, schemas));
    const revision = await nodeTreeOf(
      menu("{ $ref: '#/components/schemas/Item', description: An item }", schemas)
    );

    expect(compareTrees(base, revision)).toMatchObject([
      {
        key: '#/paths/~1menu/get/responses/200/content/application~1json/schema',
        kind: 'modified',
        property: 'description',
        base: { value: undefined },
        revision: { value: 'An item' },
      },
    ]);
  });

  it('should follow the target of a component written as a $ref with keys next to it, where a path first reaches it', async () => {
    const files = (nameType: string) => ({
      'openapi.yaml': menu(
        "{ $ref: '#/components/schemas/A' }",
        '{ A: { $ref: ./b.yaml, description: An item } }'
      ),
      'b.yaml': item(nameType),
    });
    const { base, revision } = await nodeTreesOfFiles({
      base: files('string'),
      revision: files('integer'),
    });

    expect(compareTrees(base, revision)).toMatchObject([
      {
        key: '#/paths/~1menu/get/responses/200/content/application~1json/schema/$ref/properties/name',
        kind: 'modified',
        property: 'type',
      },
    ]);
  });

  it('should compare the one target of $refs with keys next to them under $ref of the place', async () => {
    const schema = "{ $ref: '#/components/schemas/Item', description: A dish }";
    const base = await nodeTreeOf(menu(schema, `{ Item: ${item('string')} }`));
    const revision = await nodeTreeOf(menu(schema, `{ Item: ${item('integer')} }`));

    expect(compareTrees(base, revision).map((change) => change.key)).toEqual([
      '#/paths/~1menu/get/responses/200/content/application~1json/schema/$ref/properties/name',
    ]);
  });

  it('should report a renamed path by the keys of the places, not of their targets', async () => {
    const menuItem = (template: string, pathItem: string) =>
      cafe(outdent`
        paths:
          /menu/{${template}}: { $ref: '#/components/pathItems/${pathItem}' }
        components:
          pathItems:
            Item: { get: { responses: {} } }
            MenuItem: { get: { responses: {} } }
      `);
    const base = await nodeTreeOf(menuItem('id', 'Item'));
    const revision = await nodeTreeOf(menuItem('itemId', 'MenuItem'));

    expect(replaceSourceWithRefInChanges(compareTrees(base, revision))).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "api.yaml#/paths/~1menu~1{id}",
            "value": "/menu/{id}",
          },
          "key": "#/paths/~1menu~1{itemId}",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "api.yaml#/paths/~1menu~1{itemId}",
            "value": "/menu/{itemId}",
          },
        },
      ]
    `);
  });
});
