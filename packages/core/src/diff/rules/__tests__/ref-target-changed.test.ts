import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (itemSchema: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu/{menuItemId}:
      get:
        parameters:
          - { name: menuItemId, in: path, required: true, schema: { type: string } }
        responses:
          '200':
            description: OK
            content:
              application/json:
                schema: { $ref: '#/components/schemas/${itemSchema}' }
  components:
    schemas:
      Beverage: { type: object }
      Dessert: { type: object, required: [flavour] }
      Drink: { type: object }
`;

describe('ref-target-changed', () => {
  it('should report a $ref that points at a schema that describes other data', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('Beverage'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('Dessert'), 'revision.yaml'),
      config: await createConfig({ diff: { 'ref-target-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{menuItemId}/get/responses/200/content/application~1json/schema/$ref",
            "value": "#/components/schemas/Beverage",
          },
          "impact": "major",
          "key": "#/paths/~1menu~1{0}/get/responses/200/content/application~1json/schema",
          "kind": "modified",
          "property": "$ref",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{menuItemId}/get/responses/200/content/application~1json/schema/$ref",
            "value": "#/components/schemas/Dessert",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu~1{menuItemId}/get/responses/200/content/application~1json/schema/$ref",
              "message": "Reference target changed from '#/components/schemas/Beverage' to '#/components/schemas/Dessert', which describes other data.",
              "ruleId": "ref-target-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a $ref that points at a renamed schema', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('Beverage'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('Drink'), 'revision.yaml'),
      config: await createConfig({ diff: { 'ref-target-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{menuItemId}/get/responses/200/content/application~1json/schema/$ref",
            "value": "#/components/schemas/Beverage",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{0}/get/responses/200/content/application~1json/schema",
          "kind": "modified",
          "property": "$ref",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{menuItemId}/get/responses/200/content/application~1json/schema/$ref",
            "value": "#/components/schemas/Drink",
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
