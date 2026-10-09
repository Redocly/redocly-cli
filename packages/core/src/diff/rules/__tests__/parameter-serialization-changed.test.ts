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

describe('parameter-serialization-changed', () => {
  it('should report a parameter put on the wire another way', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(
          '[{ name: category, in: query, style: form, explode: true, schema: { type: array } }]'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(
          '[{ name: category, in: query, style: form, explode: false, schema: { type: array } }]'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-serialization-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/explode",
            "value": true,
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "explode",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0/explode",
            "value": false,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0/explode",
              "message": "\`explode\` of \`category\` query parameter changed from 'true' to 'false'.",
              "ruleId": "parameter-serialization-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a serialization keyword that was set or removed', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe(
          '[{ name: category, in: query, style: form, schema: { type: array } }, { name: sort, in: query, schema: { type: string } }]'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe(
          '[{ name: category, in: query, schema: { type: array } }, { name: sort, in: query, explode: false, schema: { type: string } }]'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'parameter-serialization-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/style",
            "value": "form",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/0",
          "kind": "modified",
          "property": "style",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/0",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/0",
              "message": "\`style\` of \`category\` query parameter was removed.",
              "ruleId": "parameter-serialization-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/1",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/parameters/1",
          "kind": "modified",
          "property": "explode",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/1/explode",
            "value": false,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/1/explode",
              "message": "\`explode\` of \`sort\` query parameter was set to 'false'.",
              "ruleId": "parameter-serialization-changed",
            },
          ],
        },
      ]
    `);
  });
});
