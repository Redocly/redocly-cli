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

describe('required-properties-added', () => {
  it('should report the properties a request must now send, not the ones a response now promises', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object, required: [menuItemId] }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: object, required: [menuItemId, quantity] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "menuItemId",
            ],
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "menuItemId",
              "quantity",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
              "message": "Properties became required: \`quantity\`.",
              "ruleId": "required-properties-added",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "menuItemId",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "menuItemId",
              "quantity",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a readOnly property, which a request never sends', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ properties: { orderId: { type: string, readOnly: true } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ required: [orderId], properties: { orderId: { type: string, readOnly: true } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "orderId",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "orderId",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a schema that became readOnly along with its own new required property', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(
          '{ type: object, properties: { note: { type: object, properties: { text: { type: string } } } } }'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(
          '{ type: object, properties: { note: { type: object, readOnly: true, required: [text], properties: { text: { type: string } } } } }'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "readOnly",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note/readOnly",
            "value": true,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/note/required",
            "value": [
              "text",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "readOnly",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note/readOnly",
            "value": true,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/note/required",
            "value": [
              "text",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a $ref property named by the component key whose target is readOnly', async () => {
    const cafeWithUser = (order: string) => outdent`
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
      components:
        schemas:
          User: { type: object, readOnly: true }
    `;
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafeWithUser(
          '{ type: object, properties: { owner: { $ref: "#/components/schemas/User" } } }'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafeWithUser(
          '{ type: object, required: [owner], properties: { owner: { $ref: "#/components/schemas/User" } } }'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "owner",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
