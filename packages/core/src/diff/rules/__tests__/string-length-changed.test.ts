import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (note: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${note}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${note}
`;

describe('string-length-changed', () => {
  it('should report a length limit that makes a request accept less', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: string, maxLength: 200 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: string, maxLength: 100 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'string-length-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
            "value": 200,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "maxLength",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
            "value": 100,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
              "message": "\`maxLength\` changed from '200' to '100'.",
              "ruleId": "string-length-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxLength",
            "value": 200,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maxLength",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxLength",
            "value": 100,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should treat any pattern change as accepting less, since patterns cannot be compared', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe("{ type: string, pattern: '^[a-z]+$' }"), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe("{ type: string, pattern: '^[a-z ]+$' }"),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'string-length-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
            "value": "^[a-z]+$",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "pattern",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
            "value": "^[a-z ]+$",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
              "message": "\`pattern\` changed from '^[a-z]+$' to '^[a-z ]+$'.",
              "ruleId": "string-length-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/pattern",
            "value": "^[a-z]+$",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "pattern",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/pattern",
            "value": "^[a-z ]+$",
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
