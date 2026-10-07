import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (status: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${status}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${status}
`;

describe('enum-values-removed', () => {
  it('should report the values a request no longer accepts, not the ones a response stops sending', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: string, enum: [placed, preparing, ready] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: string, enum: [placed, ready] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'enum-values-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/enum",
            "value": [
              "placed",
              "preparing",
              "ready",
            ],
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/enum",
              "message": "Enum lost values: 'preparing'.",
              "ruleId": "enum-values-removed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/enum",
            "value": [
              "placed",
              "preparing",
              "ready",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a schema used only in a response, even where a base-side writeOnly property loses values', async () => {
    const cafeWithNote = (note: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders/{orderId}:
          get:
            parameters:
              - { name: orderId, in: path, required: true, schema: { type: string } }
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: { $ref: '#/components/schemas/Order' }
      components:
        schemas:
          Order:
            type: object
            properties:
              note: ${note}
    `;
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafeWithNote('{ type: string, writeOnly: true, enum: [a, b] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafeWithNote('{ type: string, enum: [a] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'enum-values-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/schemas/Order/properties/note/writeOnly",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders~1{orderId}/get/responses/200/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "writeOnly",
          "revision": {
            "location": "revision.yaml#/components/schemas/Order/properties/note",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/schemas/Order/properties/note/enum",
            "value": [
              "a",
              "b",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders~1{orderId}/get/responses/200/content/application~1json/schema/properties/note",
          "kind": "modified",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/components/schemas/Order/properties/note/enum",
            "value": [
              "a",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
