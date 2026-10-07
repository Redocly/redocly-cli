import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (contentType?: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  channels:
    orders:
      address: orders
      messages:
        orderPlaced: { ${contentType === undefined ? '' : `contentType: ${contentType}, `}payload: { type: object } }
`;

describe('message-content-type-changed', () => {
  it('should report a message encoded another way', async () => {
    const result = await diffDocuments({
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
              "message": "\`contentType\` of message \`orderPlaced\` changed from 'application/json' to 'application/avro'.",
              "ruleId": "message-content-type-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a message that gained or lost its content type', async () => {
    const gained = await diffDocuments({
      base: makeDocumentFromString(cafe(), 'base.yaml'),
      revision: makeDocumentFromString(cafe('application/json'), 'revision.yaml'),
      config: await createConfig({ diff: { 'message-content-type-changed': 'major' } }),
    });
    const lost = await diffDocuments({
      base: makeDocumentFromString(cafe('application/json'), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'message-content-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(gained.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orders/messages/orderPlaced",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/channels/orders/messages/orderPlaced",
          "kind": "modified",
          "property": "contentType",
          "revision": {
            "location": "revision.yaml#/channels/orders/messages/orderPlaced/contentType",
            "value": "application/json",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orders/messages/orderPlaced/contentType",
              "message": "\`contentType\` of message \`orderPlaced\` was set to 'application/json'.",
              "ruleId": "message-content-type-changed",
            },
          ],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(lost.changes)).toMatchInlineSnapshot(`
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
            "location": "revision.yaml#/channels/orders/messages/orderPlaced",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/channels/orders/messages/orderPlaced",
              "message": "\`contentType\` of message \`orderPlaced\` was removed.",
              "ruleId": "message-content-type-changed",
            },
          ],
        },
      ]
    `);
  });
});
