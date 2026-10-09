import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (operations: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders/{orderId}: ${operations}
`;

const get = 'get: { responses: { 200: { description: OK } } }';
const cancel = 'delete: { responses: { 204: { description: Cancelled } } }';

describe('operation-removed', () => {
  it('should report an operation that is gone', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${get}, ${cancel} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${get} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders~1{orderId}/delete",
            "value": {
              "responses": {
                "204": {
                  "description": "Cancelled",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders~1{orderId}/delete",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders~1{orderId}/delete",
              "message": "Operation \`DELETE /orders/{orderId}\` was removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should name an AsyncAPI operation by its key', async () => {
    const kitchen = (operations: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders: { address: orders }
      operations: ${operations}
    `;
    const receive = `onOrderPlaced: { action: receive, channel: { $ref: '#/channels/orders' } }`;
    const send = `sendOrderReady: { action: send, channel: { $ref: '#/channels/orders' } }`;

    const result = await diffDocuments({
      base: makeDocumentFromString(kitchen(`{ ${receive}, ${send} }`), 'base.yaml'),
      revision: makeDocumentFromString(kitchen(`{ ${receive} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/operations/sendOrderReady",
            "value": {
              "action": "send",
              "channel": {
                "$ref": "#/channels/orders",
              },
            },
          },
          "impact": "major",
          "key": "#/operations/sendOrderReady",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/operations/sendOrderReady",
              "message": "Operation \`sendOrderReady\` was removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an operation removed from a callback', async () => {
    const withCallback = (operations: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            callbacks: { ready: { "{$request.body#/url}": { ${operations} } } }
            responses: { 200: { description: OK } }
    `;
    const post = 'post: { responses: { 200: { description: OK } } }';
    const put = 'put: { responses: { 200: { description: OK } } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(withCallback(`${post}, ${put}`), 'base.yaml'),
      revision: makeDocumentFromString(withCallback(put), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post",
            "value": {
              "responses": {
                "200": {
                  "description": "OK",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post",
              "message": "Operation \`POST {$request.body#/url}\` was removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an operation removed from a webhook', async () => {
    const withWebhook = (operations: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
      webhooks:
        orderReady: { ${operations} }
    `;
    const post = 'post: { responses: { 200: { description: OK } } }';
    const put = 'put: { responses: { 200: { description: OK } } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(withWebhook(`${post}, ${put}`), 'base.yaml'),
      revision: makeDocumentFromString(withWebhook(put), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/webhooks/orderReady/post",
            "value": {
              "responses": {
                "200": {
                  "description": "OK",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/webhooks/orderReady/post",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/webhooks/orderReady/post",
              "message": "Operation \`POST orderReady\` was removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an AsyncAPI document losing all its operations, not its components operations', async () => {
    const kitchen = (operations: string, components: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Cafe kitchen, version: 1.0.0 }
      channels:
        orders: { address: orders }
      ${operations}
      ${components}
    `;
    const receive = `onOrderPlaced: { action: receive, channel: { $ref: '#/channels/orders' } }`;
    const operations = `operations: { ${receive} }`;
    const components = `components: { operations: { ${receive} } }`;

    const document = await diffDocuments({
      base: makeDocumentFromString(kitchen(operations, ''), 'base.yaml'),
      revision: makeDocumentFromString(kitchen('', ''), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(document.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/operations",
            "value": {
              "onOrderPlaced": {
                "action": "receive",
                "channel": {
                  "$ref": "#/channels/orders",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/operations",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/operations",
              "message": "All operations were removed.",
              "ruleId": "operation-removed",
            },
          ],
        },
      ]
    `);

    const unused = await diffDocuments({
      base: makeDocumentFromString(kitchen('', components), 'base.yaml'),
      revision: makeDocumentFromString(kitchen('', 'components: {}'), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(unused.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/operations",
            "value": {
              "onOrderPlaced": {
                "action": "receive",
                "channel": {
                  "$ref": "#/channels/orders",
                },
              },
            },
          },
          "impact": "patch",
          "key": "#/components/operations",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
