import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (messages?: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  channels:
    orders:
      address: orders
      ${messages === undefined ? '' : `messages: ${messages}`}
`;

const placed = 'orderPlaced: { payload: { type: object } }';
const cancelled = 'orderCancelled: { payload: { type: object } }';

describe('message-removed', () => {
  it('should report a message that is gone from its channel', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${placed}, ${cancelled} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${placed} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'message-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders/messages/orderCancelled",
            "value": {
              "payload": {
                "type": "object",
              },
            },
          },
          "impact": "major",
          "key": "#/channels/orders/messages/orderCancelled",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/channels/orders/messages/orderCancelled",
              "message": "Message \`orderCancelled\` was removed.",
              "ruleId": "message-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report every message of a channel leaving with the whole map', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${placed} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'message-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders/messages",
            "value": {
              "orderPlaced": {
                "payload": {
                  "type": "object",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/channels/orders/messages",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/channels/orders/messages",
              "message": "All messages of channel \`orders\` were removed.",
              "ruleId": "message-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a components messages map, which no channel is', async () => {
    const withComponents = (components: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders:
          address: orders
          messages:
            ${placed}
      components: ${components}
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(
        withComponents(`{ messages: { ${cancelled} }, schemas: { Order: { type: object } } }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        withComponents('{ schemas: { Order: { type: object } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'message-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/messages",
            "value": {
              "orderCancelled": {
                "payload": {
                  "type": "object",
                },
              },
            },
          },
          "impact": "patch",
          "key": "#/components/messages",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
