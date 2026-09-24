import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (payment: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${payment}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${payment}
`;

describe('schema-combinator-changed', () => {
  it('should report a oneOf alternative a request no longer accepts, not one a response stops sending', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ oneOf: [{ const: card }, { const: cash }] }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ oneOf: [{ const: card }] }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-combinator-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/oneOf/1",
            "value": {
              "const": "cash",
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/oneOf/1",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/oneOf/1",
              "message": "\`oneOf\` subschema was removed.",
              "ruleId": "schema-combinator-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/oneOf/1",
            "value": {
              "const": "cash",
            },
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/oneOf/1",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report an allOf member a request must now satisfy, not one a response now satisfies', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ allOf: [{ required: [amount] }] }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ allOf: [{ required: [amount] }, { required: [currency] }] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-combinator-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/allOf/1",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/allOf/1",
            "value": {
              "required": [
                "currency",
              ],
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/allOf/1",
              "message": "\`allOf\` subschema was added.",
              "ruleId": "schema-combinator-changed",
            },
          ],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/allOf/1",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/allOf/1",
            "value": {
              "required": [
                "currency",
              ],
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
