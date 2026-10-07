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
    const result = await diffDocuments({
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
    const result = await diffDocuments({
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

  it('should report an AsyncAPI server that moved to another host', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ production: { host: kitchen.cafe.test, protocol: amqp } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ production: { host: kitchen.cafe.dev, protocol: amqp } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/production/host",
            "value": "kitchen.cafe.test",
          },
          "impact": "major",
          "key": "#/servers/production",
          "kind": "modified",
          "property": "host",
          "revision": {
            "location": "revision.yaml#/servers/production/host",
            "value": "kitchen.cafe.dev",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/servers/production/host",
              "message": "\`host\` of server \`production\` changed from 'kitchen.cafe.test' to 'kitchen.cafe.dev'.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an AsyncAPI server that gained or lost its pathname', async () => {
    const withoutPathname = '{ production: { host: broker.cafe.example, protocol: amqp } }';
    const withPathname =
      '{ production: { host: broker.cafe.example, pathname: /v1, protocol: amqp } }';
    const config = await createConfig({ diff: { 'server-removed': 'major' } });

    const gained = await diffDocuments({
      base: makeDocumentFromString(cafe(withoutPathname), 'base.yaml'),
      revision: makeDocumentFromString(cafe(withPathname), 'revision.yaml'),
      config,
    });
    const lost = await diffDocuments({
      base: makeDocumentFromString(cafe(withPathname), 'base.yaml'),
      revision: makeDocumentFromString(cafe(withoutPathname), 'revision.yaml'),
      config,
    });

    expect(replaceSourceWithRefInChanges(gained.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/production",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/servers/production",
          "kind": "modified",
          "property": "pathname",
          "revision": {
            "location": "revision.yaml#/servers/production/pathname",
            "value": "/v1",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/servers/production/pathname",
              "message": "\`pathname\` of server \`production\` was set to '/v1'.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(lost.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/production/pathname",
            "value": "/v1",
          },
          "impact": "major",
          "key": "#/servers/production",
          "kind": "modified",
          "property": "pathname",
          "revision": {
            "location": "revision.yaml#/servers/production",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/servers/production",
              "message": "\`pathname\` of server \`production\` was removed.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report the components servers map', async () => {
    const withComponents = (components: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels: {}
      components: ${components}
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(withComponents(`{ servers: { ${production} } }`), 'base.yaml'),
      revision: makeDocumentFromString(withComponents('{}'), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/servers",
            "value": {
              "production": {
                "host": "broker.cafe.example",
                "protocol": "amqp",
              },
            },
          },
          "impact": "patch",
          "key": "#/components/servers",
          "kind": "removed",
          "verdicts": [],
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
    const result = await diffDocuments({
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
          "key": "#/servers/0",
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
    const result = await diffDocuments({
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
    const result = await diffDocuments({
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

  it('should report a server that moved to another URL', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('[{ url: https://api.cafe.test }]'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('[{ url: https://api.cafe.dev }]'), 'revision.yaml'),
      config: await createConfig({ diff: { 'server-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/servers/0/url",
            "value": "https://api.cafe.test",
          },
          "impact": "major",
          "key": "#/servers/0",
          "kind": "modified",
          "property": "url",
          "revision": {
            "location": "revision.yaml#/servers/0/url",
            "value": "https://api.cafe.dev",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/servers/0/url",
              "message": "Server \`https://api.cafe.test\` became \`https://api.cafe.dev\`.",
              "ruleId": "server-removed",
            },
          ],
        },
      ]
    `);
  });
});
