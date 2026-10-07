import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (operationId?: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        ${operationId === undefined ? '' : `operationId: ${operationId}`}
        responses: { 200: { description: OK } }
`;

const diffOperationIds = async (base?: string, revision?: string) =>
  diffDocuments({
    base: makeDocumentFromString(cafe(base), 'base.yaml'),
    revision: makeDocumentFromString(cafe(revision), 'revision.yaml'),
    config: await createConfig({ diff: { 'operation-id-changed': 'major' } }),
  });

describe('operation-id-changed', () => {
  it('should report an operationId that changed or was removed, not one that was added', async () => {
    const changed = await diffOperationIds('listMenu', 'getMenu');

    expect(replaceSourceWithRefInChanges(changed.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/operationId",
            "value": "listMenu",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/operationId",
            "value": "getMenu",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/operationId",
              "message": "\`operationId\` of operation \`GET /menu\` changed from 'listMenu' to 'getMenu'.",
              "ruleId": "operation-id-changed",
            },
          ],
        },
      ]
    `);

    const removed = await diffOperationIds('listMenu');

    expect(replaceSourceWithRefInChanges(removed.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/operationId",
            "value": "listMenu",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get",
              "message": "\`operationId\` of operation \`GET /menu\` was removed.",
              "ruleId": "operation-id-changed",
            },
          ],
        },
      ]
    `);

    const added = await diffOperationIds(undefined, 'listMenu');

    expect(replaceSourceWithRefInChanges(added.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/operationId",
            "value": "listMenu",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report an operationId changed in a webhook or a callback', async () => {
    const withOperationIds = (webhookId: string, callbackId: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            callbacks:
              ready:
                "{$request.body#/url}":
                  post:
                    operationId: ${callbackId}
                    responses: { 200: { description: OK } }
            responses: { 200: { description: OK } }
      webhooks:
        orderReady:
          post:
            operationId: ${webhookId}
            responses: { 200: { description: OK } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(withOperationIds('onReady', 'notifyReady'), 'base.yaml'),
      revision: makeDocumentFromString(withOperationIds('readyHook', 'readyCall'), 'revision.yaml'),
      config: await createConfig({ diff: { 'operation-id-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post/operationId",
            "value": "notifyReady",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post/operationId",
            "value": "readyCall",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/callbacks/ready/{$request.body#~1url}/post/operationId",
              "message": "\`operationId\` of operation \`POST {$request.body#/url}\` changed from 'notifyReady' to 'readyCall'.",
              "ruleId": "operation-id-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/webhooks/orderReady/post/operationId",
            "value": "onReady",
          },
          "impact": "major",
          "key": "#/webhooks/orderReady/post",
          "kind": "modified",
          "property": "operationId",
          "revision": {
            "location": "revision.yaml#/webhooks/orderReady/post/operationId",
            "value": "readyHook",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/webhooks/orderReady/post/operationId",
              "message": "\`operationId\` of operation \`POST orderReady\` changed from 'onReady' to 'readyHook'.",
              "ruleId": "operation-id-changed",
            },
          ],
        },
      ]
    `);
  });
});
