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

describe('enum-values-added', () => {
  it('should report the values a response may now send, not the ones a request now accepts', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: string, enum: [placed, ready] }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: string, enum: [placed, preparing, ready] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'enum-values-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/enum",
            "value": [
              "placed",
              "preparing",
              "ready",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "impact": "major",
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/enum",
            "value": [
              "placed",
              "preparing",
              "ready",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/enum",
              "message": "Enum gained values: 'preparing'.",
              "ruleId": "enum-values-added",
            },
          ],
        },
      ]
    `);
  });

  it('should report an enum removed from a response, not an enum set on one', async () => {
    const order = (status: string, size: string) =>
      cafe(`{ type: object, properties: { status: ${status}, size: ${size} } }`);

    const result = await diffDocuments({
      base: makeDocumentFromString(
        order('{ type: string, enum: [placed, ready] }', '{ type: string }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        order('{ type: string }', '{ type: string, enum: [small, large] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'enum-values-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/status/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/status",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/status",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/size",
            "value": undefined,
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/size",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/size/enum",
            "value": [
              "small",
              "large",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/status/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "impact": "major",
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/status",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/status",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/status",
              "message": "Enum of \`status\` was removed.",
              "ruleId": "enum-values-added",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/size",
            "value": undefined,
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/size",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/properties/size/enum",
            "value": [
              "small",
              "large",
            ],
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
