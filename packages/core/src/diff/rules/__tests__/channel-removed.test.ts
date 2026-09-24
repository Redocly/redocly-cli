import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (channels?: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  ${channels === undefined ? '' : `channels: ${channels}`}
`;

const placed = 'orderPlaced: { address: orders.placed }';
const ready = 'orderReady: { address: orders.ready }';

// A channel is where messages travel, so both sides of it break together.
describe('channel-removed', () => {
  it('should report a channel that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${placed}, ${ready} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${placed} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'channel-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels/orderReady",
            "value": {
              "address": "orders.ready",
            },
          },
          "impact": "major",
          "key": "#/channels/orderReady",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/channels/orderReady",
              "message": "Channel \`orderReady\` was removed.",
              "ruleId": "channel-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report every channel leaving with the whole map', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${placed} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'channel-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/channels",
            "value": {
              "orderPlaced": {
                "address": "orders.placed",
              },
            },
          },
          "impact": "major",
          "key": "#/channels",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/channels",
              "message": "All channels were removed.",
              "ruleId": "channel-removed",
            },
          ],
        },
      ]
    `);
  });
});
