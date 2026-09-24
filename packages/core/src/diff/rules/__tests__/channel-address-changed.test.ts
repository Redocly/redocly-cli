import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (address: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  channels:
    orderPlaced: { address: ${address} }
`;

describe('channel-address-changed', () => {
  it('should report a channel that moved to another address', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('orders.placed'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('kitchen.orders.placed'), 'revision.yaml'),
      config: await createConfig({ diff: { 'channel-address-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orderPlaced/address",
            "value": "orders.placed",
          },
          "impact": "major",
          "key": "#/channels/orderPlaced",
          "kind": "modified",
          "property": "address",
          "revision": {
            "location": "revision.yaml#/channels/orderPlaced/address",
            "value": "kitchen.orders.placed",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orderPlaced/address",
              "message": "Channel \`orderPlaced\` address changed from 'orders.placed' to 'kitchen.orders.placed'.",
              "ruleId": "channel-address-changed",
            },
          ],
        },
      ]
    `);
  });
});
