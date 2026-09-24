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

describe('parameter-became-required', () => {
  it('should report an optional parameter that became required, not one that became optional', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe(
          '[{ name: limit, in: query, schema: { type: integer } }, { name: search, in: query, required: true }]'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(
          '[{ name: limit, in: query, required: true, schema: { type: integer } }, { name: search, in: query, required: false }]'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-became-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/{query:limit}",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0/required",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0/required",
              "message": "Parameter became required.",
              "ruleId": "parameter-became-required",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/1/required",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get/parameters/{query:search}",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/1/required",
            "value": false,
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
