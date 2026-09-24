import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (action: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  channels:
    orders: { address: orders }
  operations:
    onOrderPlaced:
      action: ${action}
      channel: { $ref: '#/channels/orders' }
`;

describe('operation-action-changed', () => {
  it('should report an operation that now sends what it received', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('receive'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('send'), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-action-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/operations/onOrderPlaced/action",
            "value": "receive",
          },
          "impact": "major",
          "key": "#/operations/onOrderPlaced",
          "kind": "modified",
          "property": "action",
          "revision": {
            "location": "revision.yaml#/operations/onOrderPlaced/action",
            "value": "send",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/operations/onOrderPlaced/action",
              "message": "The operation action changed from 'receive' to 'send'.",
              "ruleId": "operation-action-changed",
            },
          ],
        },
      ]
    `);
  });
});
