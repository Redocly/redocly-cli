import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (parameters?: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        ${parameters === undefined ? '' : `parameters: ${parameters}`}
        responses:
          '200': { description: OK }
  components:
    parameters:
      Sort: { name: sort, in: query, schema: { type: string } }
      Category: { name: category, in: query, required: true, schema: { type: string } }
`;

const limit = '{ name: limit, in: query, schema: { type: integer } }';
const search = '{ name: search, in: query, schema: { type: string } }';

describe('parameter-removed', () => {
  it('should report a parameter that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${limit}, ${search}]`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`[${search}]`), 'revision.yaml'),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0",
            "value": {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/{query:limit}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/parameters/0",
              "message": "Parameter was removed.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report the last parameter leaving with the whole list', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`[${limit}]`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters",
            "value": [
              {
                "in": "query",
                "name": "limit",
                "schema": {
                  "type": "integer",
                },
              },
            ],
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/parameters",
              "message": "Every parameter was removed.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a referenced parameter swapped for another', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe("[{ $ref: '#/components/parameters/Sort' }]"), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe("[{ $ref: '#/components/parameters/Category' }]"),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0",
            "value": {
              "in": "query",
              "name": "sort",
              "schema": {
                "type": "string",
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/{query:sort}",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/parameters/0",
              "message": "Parameter was removed.",
              "ruleId": "parameter-removed",
            },
          ],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1menu/get/parameters/{query:category}",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0",
            "value": {
              "in": "query",
              "name": "category",
              "required": true,
              "schema": {
                "type": "string",
              },
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
