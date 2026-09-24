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

describe('security-scopes-added', () => {
  it('should report the scopes a requirement now asks for', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ OAuth: [orders:read] }] }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ OAuth: [orders:read, orders:write] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-scopes-added': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/get/security/0/OAuth",
            "value": [
              "orders:read",
            ],
          },
          "impact": "major",
          "key": "#/paths/~1orders/get/security/{OAuth}",
          "kind": "modified",
          "property": "OAuth",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security/0/OAuth",
            "value": [
              "orders:read",
              "orders:write",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/get/security/0/OAuth",
              "message": "Security scheme \`OAuth\` requires new scopes: 'orders:write'.",
              "ruleId": "security-scopes-added",
            },
          ],
        },
      ]
    `);
  });
});
