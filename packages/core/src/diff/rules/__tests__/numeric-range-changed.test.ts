import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (quantity: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${quantity}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${quantity}
`;

describe('numeric-range-changed', () => {
  it('should report a bound that makes a request accept less, not one that lets a response send less', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, maximum: 20 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, maximum: 10 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
            "value": 20,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "maximum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
            "value": 10,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
              "message": "\`maximum\` changed from '20' to '10'.",
              "ruleId": "numeric-range-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maximum",
            "value": 20,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maximum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maximum",
            "value": 10,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a bound that lets a response send more, not one that makes a request accept more', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, minimum: 1 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, minimum: 0 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 1,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 0,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 1,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 0,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
              "message": "\`minimum\` changed from '1' to '0'.",
              "ruleId": "numeric-range-changed",
            },
          ],
        },
      ]
    `);
  });
});
