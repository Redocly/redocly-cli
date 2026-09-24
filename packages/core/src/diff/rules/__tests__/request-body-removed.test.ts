import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (operation: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post: ${operation}
`;

const created = "responses: { '201': { description: Created } }";
const order = 'requestBody: { content: { application/json: { schema: { type: object } } } }';

describe('request-body-removed', () => {
  it('should report a request body that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${order}, ${created} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${created} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'request-body-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody",
            "value": {
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/requestBody",
              "message": "The request body was removed.",
              "ruleId": "request-body-removed",
            },
          ],
        },
      ]
    `);
  });
});
