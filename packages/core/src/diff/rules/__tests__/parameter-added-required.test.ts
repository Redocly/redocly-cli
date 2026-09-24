import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (parameters: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        parameters: ${parameters}
        responses:
          '200': { description: OK }
  components:
    parameters:
      Sort: { name: sort, in: query, schema: { type: string } }
      Category: { name: category, in: query, required: true, schema: { type: string } }
`;

const search = '{ name: search, in: query, schema: { type: string } }';

describe('parameter-added-required', () => {
  it('should report a new required parameter, not a new optional one', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${search}]`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(
          `[${search}, { name: limit, in: query, schema: { type: integer } }, { name: locale, in: header, required: true, schema: { type: string } }]`
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-added-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1menu/get/parameters/{query:limit}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/1",
            "value": {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
              },
            },
          },
          "verdicts": [],
        },
        {
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/{header:locale}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/2",
            "value": {
              "in": "header",
              "name": "locale",
              "required": true,
              "schema": {
                "type": "string",
              },
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/2",
              "message": "Required \`locale\` header parameter was added.",
              "ruleId": "parameter-added-required",
            },
          ],
        },
      ]
    `);
  });

  it('should read whether a referenced parameter is required from what it points at', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe("[{ $ref: '#/components/parameters/Sort' }]"), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(
          "[{ $ref: '#/components/parameters/Sort' }, { $ref: '#/components/parameters/Category' }]"
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-added-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/{query:category}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/1",
            "value": {
              "in": "query",
              "name": "category",
              "required": true,
              "schema": {
                "type": "string",
              },
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/1",
              "message": "Required \`category\` query parameter was added.",
              "ruleId": "parameter-added-required",
            },
          ],
        },
      ]
    `);
  });

  it('should not report referenced parameters listed in another order', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe(
          "[{ $ref: '#/components/parameters/Sort' }, { $ref: '#/components/parameters/Category' }]"
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(
          "[{ $ref: '#/components/parameters/Category' }, { $ref: '#/components/parameters/Sort' }]"
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-added-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`[]`);
  });
});
