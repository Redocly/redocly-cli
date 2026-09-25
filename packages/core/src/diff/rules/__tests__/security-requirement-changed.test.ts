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

describe('security-requirement-changed', () => {
  it('should report a security list that appears where there was none', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
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
              "message": "Authentication became required.",
              "ruleId": "security-requirement-changed",
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
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
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
              "message": "Authentication became required.",
              "ruleId": "security-requirement-changed",
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
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
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
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
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
              "ruleId": "security-requirement-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a requirement that now asks for one more scheme', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [], OAuth: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/get/security/{ApiKey}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/get/security/0",
              "message": "Security requirement \`ApiKey\` is no longer accepted.",
              "ruleId": "security-requirement-changed",
            },
          ],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/get/security/{ApiKey+OAuth}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
              "OAuth": [],
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report an alternative that clients can no longer use', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }, { OAuth: [] }] }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ OAuth: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/get/security/{ApiKey}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/get/security/0",
              "message": "Security requirement \`ApiKey\` is no longer accepted.",
              "ruleId": "security-requirement-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a requirement that another one still covers, or a list that asks for none', async () => {
    const covered = diffDocuments({
      base: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [], OAuth: [] }] }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
    });
    const optional = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${ok}, security: [{ ApiKey: [] }] }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${ok}, security: [] }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'security-requirement-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(covered.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
              "OAuth": [],
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/get/security/{ApiKey+OAuth}",
          "kind": "removed",
          "verdicts": [],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/get/security/{ApiKey}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
            },
          },
          "verdicts": [],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(optional.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/get/security/0",
            "value": {
              "ApiKey": [],
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/get/security/{ApiKey}",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
