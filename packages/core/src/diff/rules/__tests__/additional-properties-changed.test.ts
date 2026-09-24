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

describe('additional-properties-changed', () => {
  it('should report closing an open request object, not an open response object', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: true }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: false }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'additional-properties-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
              "message": "\`additionalProperties\` changed from 'true' to 'false'.",
              "ruleId": "additional-properties-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report opening a closed response object, not a closed request object', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: false }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: true }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'additional-properties-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
              "message": "\`additionalProperties\` changed from 'false' to 'true'.",
              "ruleId": "additional-properties-changed",
            },
          ],
        },
      ]
    `);
  });
});
