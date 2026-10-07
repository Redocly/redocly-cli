import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (order: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${order}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${order}
`;

describe('property-removed', () => {
  it('should report a property a response no longer sends, not one a request no longer takes', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(
          '{ type: object, properties: { menuItemId: { type: string }, note: { type: string } } }'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, properties: { menuItemId: { type: string } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
            "value": {
              "type": "string",
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
            "value": {
              "type": "string",
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
              "message": "Property \`note\` was removed.",
              "ruleId": "property-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a oneOf alternative, which is not a property', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ oneOf: [{ type: string }, { type: integer }] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ oneOf: [{ type: string }] }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/oneOf/1",
            "value": {
              "type": "integer",
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/oneOf/1",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/oneOf/1",
            "value": {
              "type": "integer",
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/oneOf/1",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a writeOnly property, which a response never sends', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ properties: { pin: { type: string, writeOnly: true } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ properties: {} }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/pin",
            "value": {
              "type": "string",
              "writeOnly": true,
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/pin",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/pin",
            "value": {
              "type": "string",
              "writeOnly": true,
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/pin",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report every property leaving with the whole properties map', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, properties: { note: { type: string } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ type: object }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties",
            "value": {
              "note": {
                "type": "string",
              },
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties",
            "value": {
              "note": {
                "type": "string",
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties",
              "message": "All properties were removed.",
              "ruleId": "property-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a property renamed in a response, not in a request', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, properties: { name: { type: string } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, properties: { names: { type: string } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/name",
            "value": "name",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/names",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/names",
            "value": "names",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/name",
            "value": "name",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/names",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/names",
            "value": "names",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/names",
              "message": "Property \`name\` was renamed to \`names\`.",
              "ruleId": "property-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should name the owner of a removed property by the place of its $ref, not by its target', async () => {
    const order = (item: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: { $ref: '#/components/schemas/Order' }
      components:
        schemas:
          Order: { type: object, properties: { item: { $ref: '#/components/schemas/${item}' } } }
          Item: { type: object, properties: { name: { type: string }, price: { type: number } } }
          MenuItem: { type: object, properties: { name: { type: string } } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(order('Item'), 'base.yaml'),
      revision: makeDocumentFromString(order('MenuItem'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(result.changes.flatMap((change) => change.verdicts)).toMatchObject([
      { message: 'Property `price` of `item` was removed.' },
    ]);
  });

  it('should not name the owner of a property written next to a $ref', async () => {
    const order = (properties: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: { $ref: '#/components/schemas/Order', properties: ${properties} }
      components:
        schemas:
          Order: { type: object }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(
        order('{ id: { type: string }, extra: { type: string } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(order('{ id: { type: string } }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed': 'major' } }),
    });

    expect(result.changes.flatMap((change) => change.verdicts)).toMatchObject([
      { message: 'Property `extra` was removed.' },
    ]);
  });
});
