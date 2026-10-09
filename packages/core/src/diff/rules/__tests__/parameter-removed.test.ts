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
    const result = await diffDocuments({
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
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/parameters/0",
              "message": "\`limit\` query parameter was removed.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report the last parameter leaving with the whole list', async () => {
    const result = await diffDocuments({
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
              "message": "All parameters were removed.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a referenced parameter swapped for another', async () => {
    const result = await diffDocuments({
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
            "location": "base.yaml#/components/parameters/Sort/name",
            "value": "sort",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/components/parameters/Category/name",
            "value": "category",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/parameters/Category/name",
              "message": "\`sort\` query parameter was renamed to \`category\`.",
              "ruleId": "parameter-removed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/components/parameters/Sort",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/components/parameters/Category/required",
            "value": true,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a parameter moved to another place in the request', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('[{ name: token, in: query, schema: { type: string } }]'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('[{ name: token, in: header, schema: { type: string } }]'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/in",
            "value": "query",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "in",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0/in",
            "value": "header",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0/in",
              "message": "\`token\` query parameter is now a header parameter.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should name a parameter by its old name and place when both changed', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('[{ name: id, in: query, schema: { type: string } }]'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('[{ name: itemId, in: header, schema: { type: string } }]'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/name",
            "value": "id",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0/name",
            "value": "itemId",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0/name",
              "message": "\`id\` query parameter was renamed to \`itemId\`.",
              "ruleId": "parameter-removed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/in",
            "value": "query",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "in",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0/in",
            "value": "header",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0/in",
              "message": "\`id\` query parameter is now a header parameter.",
              "ruleId": "parameter-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a path parameter renamed with its path, or a header renamed only in case', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        outdent`
          openapi: 3.1.0
          info: { title: Cafe, version: 1.0.0 }
          paths:
            /menu/{id}:
              get:
                parameters:
                  - { name: id, in: path, required: true, schema: { type: string } }
                  - { name: X-Token, in: header, schema: { type: string } }
                responses:
                  '200': { description: OK }
        `,
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        outdent`
          openapi: 3.1.0
          info: { title: Cafe, version: 1.0.0 }
          paths:
            /menu/{itemId}:
              get:
                parameters:
                  - { name: itemId, in: path, required: true, schema: { type: string } }
                  - { name: x-token, in: header, schema: { type: string } }
                responses:
                  '200': { description: OK }
        `,
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
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
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{id}/get/parameters/0/name",
            "value": "id",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{itemId}/get/parameters/0",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{itemId}/get/parameters/0/name",
            "value": "itemId",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{id}/get/parameters/1/name",
            "value": "X-Token",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{itemId}/get/parameters/1",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{itemId}/get/parameters/1/name",
            "value": "x-token",
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
