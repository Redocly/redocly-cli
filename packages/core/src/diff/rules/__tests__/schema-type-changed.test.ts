import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (openapi: string, price: string) => outdent`
  openapi: ${openapi}
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${price}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${price}
`;

describe('schema-type-changed', () => {
  it('should report a request that accepts fewer types, not a response that sends fewer', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('3.1.0', '{ type: number }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('3.1.0', '{ type: integer }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "number",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "integer",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
              "message": "Type narrowed from 'number' to 'integer'.",
              "ruleId": "schema-type-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "number",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "integer",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a response that sends more types, not a request that accepts more', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('3.1.0', '{ type: integer }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('3.1.0', '{ type: number }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "integer",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "number",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "integer",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "number",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
              "message": "Type widened from 'integer' to 'number'.",
              "ruleId": "schema-type-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a request that no longer accepts null in OpenAPI 3.0', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('3.0.3', '{ type: number, nullable: true }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('3.0.3', '{ type: number }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/nullable",
            "value": true,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "nullable",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
              "message": "Type narrowed from 'number | null' to 'number'.",
              "ruleId": "schema-type-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/nullable",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "nullable",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it("should read OpenAPI 3.0 `nullable: true` as the 3.1 `type: [..., 'null']`", async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('3.0.3', '{ type: number, nullable: true }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('3.1.0', '{ type: [number, "null"] }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/openapi",
            "value": "3.0.3",
          },
          "impact": "patch",
          "key": "#/",
          "kind": "modified",
          "property": "openapi",
          "revision": {
            "location": "revision.yaml#/openapi",
            "value": "3.1.0",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "number",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": [
              "number",
              "null",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/nullable",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "nullable",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "number",
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": [
              "number",
              "null",
            ],
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/nullable",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "nullable",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
