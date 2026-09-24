import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (operations: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders/{orderId}: ${operations}
`;

const get = 'get: { responses: { 200: { description: OK } } }';
const cancel = 'delete: { responses: { 204: { description: Cancelled } } }';

describe('operation-removed', () => {
  it('should report an operation that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${get}, ${cancel} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${get} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders~1{orderId}/delete",
            "value": {
              "responses": {
                "204": {
                  "description": "Cancelled",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders~1{0}/delete",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders~1{orderId}/delete",
              "message": "Operation was removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);
  });
});
