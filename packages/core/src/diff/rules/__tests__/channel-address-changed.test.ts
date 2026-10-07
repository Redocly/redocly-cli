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
    const result = await diffDocuments({
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
              "message": "\`address\` of channel \`orderPlaced\` changed from 'orders.placed' to 'kitchen.orders.placed'.",
              "ruleId": "channel-address-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a channel that got an address', async () => {
    const orders = (channel: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders: ${channel}
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(orders('{ title: Orders }'), 'base.yaml'),
      revision: makeDocumentFromString(
        orders('{ address: orders, title: Orders }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'channel-address-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/channels/orders",
          "kind": "modified",
          "property": "address",
          "revision": {
            "location": "revision.yaml#/channels/orders/address",
            "value": "orders",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orders/address",
              "message": "\`address\` of channel \`orders\` was set to 'orders'.",
              "ruleId": "channel-address-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a channel that lost its address', async () => {
    const orders = (channel: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders: ${channel}
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(orders('{ address: orders, title: Orders }'), 'base.yaml'),
      revision: makeDocumentFromString(orders('{ title: Orders }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'channel-address-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders/address",
            "value": "orders",
          },
          "impact": "major",
          "key": "#/channels/orders",
          "kind": "modified",
          "property": "address",
          "revision": {
            "location": "revision.yaml#/channels/orders",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orders",
              "message": "\`address\` of channel \`orders\` was removed.",
              "ruleId": "channel-address-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should name the channel an operation points to by the channel, not by the operation field', async () => {
    const kitchen = (channel: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders: { address: orders }
        ordersV2: { address: orders.v2 }
      operations:
        placeOrder: { action: send, channel: { $ref: '#/channels/${channel}' } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(kitchen('orders'), 'base.yaml'),
      revision: makeDocumentFromString(kitchen('ordersV2'), 'revision.yaml'),
      config: await createConfig({ diff: { 'channel-address-changed': 'major' } }),
    });

    expect(result.changes.flatMap((change) => change.verdicts)).toMatchObject([
      { message: "`address` of channel `ordersV2` changed from 'orders' to 'orders.v2'." },
    ]);
  });
});
