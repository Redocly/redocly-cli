import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (contentType: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  channels:
    orders:
      address: orders
      messages:
        orderPlaced: { contentType: ${contentType}, payload: { type: object } }
`;

describe('message-content-type-changed', () => {
  it('should report a message encoded another way', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('application/json'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('application/avro'), 'revision.yaml'),
      config: await createConfig({ diff: { 'message-content-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders/messages/orderPlaced/contentType",
            "value": "application/json",
          },
          "impact": "major",
          "key": "#/channels/orders/messages/orderPlaced",
          "kind": "modified",
          "property": "contentType",
          "revision": {
            "location": "revision.yaml#/channels/orders/messages/orderPlaced/contentType",
            "value": "application/avro",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orders/messages/orderPlaced/contentType",
              "message": "The message content type changed from 'application/json' to 'application/avro'.",
              "ruleId": "message-content-type-changed",
            },
          ],
        },
      ]
    `);
  });
});
