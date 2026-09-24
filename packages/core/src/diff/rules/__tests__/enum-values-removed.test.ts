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
    const result = diffDocuments({
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
              "message": "Enum values removed: preparing.",
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
});
