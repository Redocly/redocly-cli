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

describe('required-properties-removed', () => {
  it('should report the properties a response no longer promises, not the ones a request may now omit', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, required: [menuItemId, quantity] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, required: [menuItemId] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "menuItemId",
              "quantity",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "menuItemId",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "menuItemId",
              "quantity",
            ],
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "menuItemId",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
              "message": "Properties are no longer required: \`quantity\`.",
              "ruleId": "required-properties-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a writeOnly property, which a response never sends', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ required: [pin], properties: { pin: { type: string, writeOnly: true } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ properties: { pin: { type: string, writeOnly: true } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'required-properties-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/required",
            "value": [
              "pin",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/required",
            "value": [
              "pin",
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
