import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (pickupAt: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${pickupAt}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${pickupAt}
`;

describe('schema-format-changed', () => {
  it('should report a format added to a request, not to a response', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: string }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: string, format: date-time }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-format-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "format",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/format",
            "value": "date-time",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/format",
              "message": "\`format\` was added with value 'date-time'.",
              "ruleId": "schema-format-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "format",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/format",
            "value": "date-time",
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
