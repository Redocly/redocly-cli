import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (operation: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      get: ${operation}
  components:
    securitySchemes:
      ApiKey: { type: apiKey, in: header, name: X-Api-Key }
      OAuth:
        type: oauth2
        flows:
          clientCredentials:
            tokenUrl: https://api.cafe.example/token
            scopes: { orders:read: Read orders, orders:write: Write orders }
`;

const ok = 'responses: { 200: { description: OK } }';

describe('security-requirement-added', () => {
  it('should report a security list that appears where there was none', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/get/security",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security",
            "value": [
              {
                "ApiKey": [],
              },
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/get/security",
              "message": "The API now requires authentication.",
              "ruleId": "security-requirement-added",
            },
          ],
        },
      ]
    `);
  });

  it('should report the first requirement filling a list that asked for none', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok}, security: [] }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/get/security/{ApiKey}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/get/security/0",
              "message": "The API now requires authentication.",
              "ruleId": "security-requirement-added",
            },
          ],
        },
      ]
    `);
  });

  it('should not report another way to authenticate', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }, { OAuth: [orders:read] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1orders/get/security/{OAuth}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security/1",
            "value": {
              "OAuth": [
                "orders:read",
              ],
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
