import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (servers?: string) => outdent`
  asyncapi: 3.0.0
  info: { title: Cafe kitchen, version: 1.0.0 }
  ${servers === undefined ? '' : `servers: ${servers}`}
  channels: {}
`;

const production = 'production: { host: broker.cafe.example, protocol: amqp }';
const sandbox = 'sandbox: { host: sandbox.cafe.example, protocol: amqp }';

describe('server-removed', () => {
  it('should report a server that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${production}, ${sandbox} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${production} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/sandbox",
            "value": {
              "host": "sandbox.cafe.example",
              "protocol": "amqp",
            },
          },
          "impact": "major",
          "key": "#/servers/sandbox",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/servers/sandbox",
              "message": "The server was removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report every server leaving with the whole map', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${production} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers",
            "value": {
              "production": {
                "host": "broker.cafe.example",
                "protocol": "amqp",
              },
            },
          },
          "impact": "major",
          "key": "#/servers",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/servers",
              "message": "Every server was removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });
});
