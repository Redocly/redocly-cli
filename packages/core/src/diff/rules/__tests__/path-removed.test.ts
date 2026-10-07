import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (paths: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: ${paths}
`;

const menu = '/menu: { get: { responses: { 200: { description: OK } } } }';
const revenue = '/revenue: { get: { responses: { 200: { description: OK } } } }';

describe('path-removed', () => {
  it('should report a path that is gone', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${menu}, ${revenue} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${menu} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1revenue",
            "value": {
              "get": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1revenue",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1revenue",
              "message": "Path \`/revenue\` was removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a renamed path, not one whose template names changed', async () => {
    const renamed = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${menu} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ /menus: { get: { responses: { 200: { description: OK } } } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(renamed.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu",
            "value": "/menu",
          },
          "impact": "major",
          "key": "#/paths/~1menus",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1menus",
            "value": "/menus",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menus",
              "message": "Path \`/menu\` was renamed to \`/menus\`.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);

    const menuItem = (name: string) =>
      `{ "/menu/{${name}}": { get: { responses: { 200: { description: OK } } } } }`;
    const renamedTemplate = await diffDocuments({
      base: makeDocumentFromString(cafe(menuItem('id')), 'base.yaml'),
      revision: makeDocumentFromString(cafe(menuItem('itemId')), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(renamedTemplate.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{id}",
            "value": "/menu/{id}",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{itemId}",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{itemId}",
            "value": "/menu/{itemId}",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a removed webhook', async () => {
    const withWebhooks = (webhooks: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: { ${menu} }
      webhooks: ${webhooks}
    `;
    const orderPlaced = 'orderPlaced: { post: { responses: { 200: { description: OK } } } }';
    const orderReady = 'orderReady: { post: { responses: { 200: { description: OK } } } }';
    const webhook = await diffDocuments({
      base: makeDocumentFromString(withWebhooks(`{ ${orderPlaced}, ${orderReady} }`), 'base.yaml'),
      revision: makeDocumentFromString(withWebhooks(`{ ${orderPlaced} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(webhook.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/webhooks/orderReady",
            "value": {
              "post": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/webhooks/orderReady",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/webhooks/orderReady",
              "message": "Webhook \`orderReady\` was removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a removed callback and a callback URL it no longer calls', async () => {
    const withCallbacks = (callbacks: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            callbacks: ${callbacks}
            responses: { 200: { description: OK } }
    `;
    const url = '"{$request.body#/url}": { post: { responses: { 200: { description: OK } } } }';
    const other = '"{$request.body#/other}": { post: { responses: { 200: { description: OK } } } }';

    const callback = await diffDocuments({
      base: makeDocumentFromString(withCallbacks(`{ ready: { ${url} } }`), 'base.yaml'),
      revision: makeDocumentFromString(withCallbacks('{}'), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(callback.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/callbacks/ready",
            "value": {
              "{$request.body#/url}": {
                "post": {
                  "responses": {
                    "200": {
                      "description": "OK",
                    },
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/callbacks/ready",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/callbacks/ready",
              "message": "Callback \`ready\` was removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);

    const callbackUrl = await diffDocuments({
      base: makeDocumentFromString(withCallbacks(`{ ready: { ${url}, ${other} } }`), 'base.yaml'),
      revision: makeDocumentFromString(withCallbacks(`{ ready: { ${url} } }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(callbackUrl.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1other}",
            "value": {
              "post": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/callbacks/ready/{$request.body#~1other}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1other}",
              "message": "Callback \`ready\` no longer calls \`{$request.body#/other}\`.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an operation losing all its callbacks', async () => {
    const withCallbacks = (callbacks: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            ${callbacks}
            responses: { 200: { description: OK } }
    `;
    const url = '"{$request.body#/url}": { post: { responses: { 200: { description: OK } } } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(withCallbacks(`callbacks: { ready: { ${url} } }`), 'base.yaml'),
      revision: makeDocumentFromString(withCallbacks(''), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/callbacks",
            "value": {
              "ready": {
                "{$request.body#/url}": {
                  "post": {
                    "responses": {
                      "200": {
                        "description": "OK",
                      },
                    },
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/callbacks",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/callbacks",
              "message": "All callbacks were removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report the document losing all its paths', async () => {
    const withWebhooks = (paths: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      ${paths}
      webhooks:
        orderReady: { post: { responses: { 200: { description: OK } } } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(withWebhooks(`paths: { ${menu} }`), 'base.yaml'),
      revision: makeDocumentFromString(withWebhooks(''), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths",
            "value": {
              "/menu": {
                "get": {
                  "responses": {
                    "200": {
                      "description": "OK",
                    },
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths",
              "message": "All paths were removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report the document losing all its webhooks', async () => {
    const withWebhooks = (webhooks: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: { ${menu} }
      ${webhooks}
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(
        withWebhooks(
          'webhooks: { orderReady: { post: { responses: { 200: { description: OK } } } } }'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(withWebhooks(''), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/webhooks",
            "value": {
              "orderReady": {
                "post": {
                  "responses": {
                    "200": {
                      "description": "OK",
                    },
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/webhooks",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/webhooks",
              "message": "All webhooks were removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a callback of the components that nothing references', async () => {
    const withComponentCallback = (callback: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
      components:
        callbacks:
          Ready: ${callback}
    `;
    const url = (operations: string) => `"{$request.body#/url}": { ${operations} }`;
    const post = (operationId: string) =>
      `post: { operationId: ${operationId}, responses: { 200: { description: OK } } }`;
    const put = 'put: { responses: { 200: { description: OK } } }';
    const other = '"{$request.body#/other}": { post: { responses: { 200: { description: OK } } } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(
        withComponentCallback(`{ ${url(`${post('notifyReady')}, ${put}`)}, ${other} }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        withComponentCallback(`{ ${url(post('readyCall'))} }`),
        'revision.yaml'
      ),
      config: await createConfig({
        diff: {
          'path-removed': 'major',
          'operation-removed': 'major',
          'operation-id-changed': 'major',
        },
      }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/callbacks/Ready/{$request.body#~1url}/post/operationId",
            "value": "notifyReady",
          },
          "impact": "patch",
          "key": "#/components/callbacks/Ready/{$request.body#~1url}/post",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/components/callbacks/Ready/{$request.body#~1url}/post/operationId",
            "value": "readyCall",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/callbacks/Ready/{$request.body#~1url}/put",
            "value": {
              "responses": {
                "200": {
                  "description": "OK",
                },
              },
            },
          },
          "impact": "patch",
          "key": "#/components/callbacks/Ready/{$request.body#~1url}/put",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/callbacks/Ready/{$request.body#~1other}",
            "value": {
              "post": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "patch",
          "key": "#/components/callbacks/Ready/{$request.body#~1other}",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
