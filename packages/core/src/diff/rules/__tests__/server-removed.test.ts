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
              "message": "Server \`sandbox\` was removed.",
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
              "message": "All servers were removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });
});

describe('server-removed for OpenAPI', () => {
  const cafe = (servers?: string, operationServers?: string) => outdent`
    openapi: 3.1.0
    info: { title: Cafe, version: 1.0.0 }
    ${servers === undefined ? '' : `servers: ${servers}`}
    paths:
      /menu:
        get:
          ${operationServers === undefined ? '' : `servers: ${operationServers}`}
          responses: { 200: { description: OK } }
  `;
  const production = '{ url: https://api.cafe.example }';
  const sandbox = '{ url: https://sandbox.cafe.example }';

  it('should report a server that is gone, whatever its position in the list', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${sandbox}, ${production}]`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`[${production}]`), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/0",
            "value": {
              "url": "https://sandbox.cafe.example",
            },
          },
          "impact": "major",
          "key": "#/servers/{https:~1~1sandbox.cafe.example}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/servers/0",
              "message": "Server \`https://sandbox.cafe.example\` was removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report the document losing its servers list', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${production}]`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers",
            "value": [
              {
                "url": "https://api.cafe.example",
              },
            ],
          },
          "impact": "major",
          "key": "#/servers",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/servers",
              "message": "All servers were removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report an operation losing its own servers, which falls back to the document', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${production}]`, `[${sandbox}]`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`[${production}]`), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/servers",
            "value": [
              {
                "url": "https://sandbox.cafe.example",
              },
            ],
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get/servers",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
