import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (responses: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders/{orderId}:
      get:
        parameters:
          - { name: orderId, in: path, required: true, schema: { type: string } }
        responses: ${responses}
`;

describe('response-removed', () => {
  it('should report a response that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe("{ '200': { description: OK }, '404': { description: Not found } }"),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe("{ '200': { description: OK } }"), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders~1{orderId}/get/responses/404",
            "value": {
              "description": "Not found",
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders~1{0}/get/responses/404",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders~1{orderId}/get/responses/404",
              "message": "Response was removed.",
              "ruleId": "response-removed",
            },
          ],
        },
      ]
    `);
  });
});
