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

describe('property-removed-from-response', () => {
  it('should report a property a response no longer sends, not one a request no longer takes', async () => {
    const result = diffDocuments({
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
      config: await createConfig({ diff: { 'property-removed-from-response': 'major' } }),
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
              "message": "Schema property was removed.",
              "ruleId": "property-removed-from-response",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a oneOf alternative, which is not a property', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ oneOf: [{ type: string }, { type: integer }] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ oneOf: [{ type: string }] }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'property-removed-from-response': 'major' } }),
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
});
