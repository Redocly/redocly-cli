import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (response: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        responses:
          '201': ${response}
`;

const location = 'Location: { schema: { type: string } }';
const rateLimit = 'X-Rate-Limit: { schema: { type: integer } }';

describe('response-header-removed', () => {
  it('should report a header that is gone', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(`{ description: Created, headers: { ${location}, ${rateLimit} } }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(`{ description: Created, headers: { ${location} } }`),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'response-header-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/headers/X-Rate-Limit",
            "value": {
              "schema": {
                "type": "integer",
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/headers/X-Rate-Limit",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/headers/X-Rate-Limit",
              "message": "Response header \`X-Rate-Limit\` was removed.",
              "ruleId": "response-header-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report every header leaving with the whole map', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(`{ description: Created, headers: { ${location} } }`),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ description: Created }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-header-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/headers",
            "value": {
              "Location": {
                "schema": {
                  "type": "string",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/headers",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/headers",
              "message": "All headers of response \`201\` were removed.",
              "ruleId": "response-header-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a renamed header, not one renamed only in case', async () => {
    const withHeader = (name: string) =>
      cafe(`{ description: Created, headers: { ${name}: { schema: { type: integer } } } }`);
    const config = await createConfig({ diff: { 'response-header-removed': 'major' } });

    const renamed = await diffDocuments({
      base: makeDocumentFromString(withHeader('X-Rate'), 'base.yaml'),
      revision: makeDocumentFromString(withHeader('X-RateLimit'), 'revision.yaml'),
      config,
    });
    const recased = await diffDocuments({
      base: makeDocumentFromString(withHeader('X-Rate'), 'base.yaml'),
      revision: makeDocumentFromString(withHeader('x-rate'), 'revision.yaml'),
      config,
    });

    expect(replaceSourceWithRefInChanges(renamed.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/headers/X-Rate",
            "value": "X-Rate",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/headers/X-RateLimit",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/headers/X-RateLimit",
            "value": "X-RateLimit",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/headers/X-RateLimit",
              "message": "Response header \`X-Rate\` was renamed to \`X-RateLimit\`.",
              "ruleId": "response-header-removed",
            },
          ],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(recased.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/headers/X-Rate",
            "value": "X-Rate",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/headers/x-rate",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/headers/x-rate",
            "value": "x-rate",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a removed component header', async () => {
    const withComponents = (headers: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            responses:
              '201': { description: Created }
      components:
        headers: ${headers}
    `;
    const result = await diffDocuments({
      base: makeDocumentFromString(
        withComponents('{ X-Rate: { schema: { type: integer } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(withComponents('{}'), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-header-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/headers/X-Rate",
            "value": {
              "schema": {
                "type": "integer",
              },
            },
          },
          "impact": "patch",
          "key": "#/components/headers/X-Rate",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
