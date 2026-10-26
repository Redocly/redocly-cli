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
    const result = await diffDocuments({
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
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
    const result = await diffDocuments({
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
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
    const result = await diffDocuments({
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
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
    const result = await diffDocuments({
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
          "kind": "modified",
          "path": "#/",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
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
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
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

  it('should report a type that a schema without one now requires in a request', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('3.1.0', '{ description: Price }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('3.1.0', '{ description: Price, type: number }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "major",
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "number",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
              "message": "Type narrowed from 'any' to 'number'.",
              "ruleId": "schema-type-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/type",
            "value": "number",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a type that a response no longer keeps to', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('3.1.0', '{ description: Price, type: number }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('3.1.0', '{ description: Price }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-type-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/type",
            "value": "number",
          },
          "impact": "patch",
          "kind": "modified",
          "path": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "property": "type",
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
          "impact": "major",
          "kind": "modified",
          "path": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
              "message": "Type widened from 'number' to 'any'.",
              "ruleId": "schema-type-changed",
            },
          ],
        },
      ]
    `);
  });
});
