import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (requestSchema: string, responseSchema = requestSchema) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${requestSchema}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${responseSchema}
`;

describe('schema-constraint-changed', () => {
  it('should report a bound that makes a request accept less, not one that lets a response send less', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, maximum: 20 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, maximum: 10 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
            "value": 20,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "maximum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
            "value": 10,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maximum",
              "message": "Upper bound changed from '<= 20' to '<= 10'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maximum",
            "value": 20,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maximum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maximum",
            "value": 10,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a bound that lets a response send more, not one that makes a request accept more', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, minimum: 1 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, minimum: 0 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 1,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 0,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 1,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 0,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
              "message": "Lower bound changed from '>= 1' to '>= 0'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report an OpenAPI 3.0 bound written the OpenAPI 3.1 way', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: number, minimum: 0, exclusiveMinimum: true }').replace('3.1.0', '3.0.3'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: number, exclusiveMinimum: 0 }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
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
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 0,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/exclusiveMinimum",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "exclusiveMinimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/exclusiveMinimum",
            "value": 0,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 0,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/exclusiveMinimum",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "exclusiveMinimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/exclusiveMinimum",
            "value": 0,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a bound that became exclusive in a request', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: number, minimum: 0 }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: number, exclusiveMinimum: 0 }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 0,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
              "message": "Lower bound changed from '>= 0' to '> 0'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "exclusiveMinimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/exclusiveMinimum",
            "value": 0,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/minimum",
            "value": 0,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "exclusiveMinimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/exclusiveMinimum",
            "value": 0,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a length limit that makes a request accept less', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: string, maxLength: 200 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: string, maxLength: 100 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
            "value": 200,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "maxLength",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
            "value": 100,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxLength",
              "message": "\`maxLength\` changed from '200' to '100'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxLength",
            "value": 200,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maxLength",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxLength",
            "value": 100,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a pattern that changed in a response, which may now send values a client rejects', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe("{ type: string, pattern: '^[a-z]+$' }"), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe("{ type: string, pattern: '^[a-z ]+$' }"),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
            "value": "^[a-z]+$",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "pattern",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
            "value": "^[a-z ]+$",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/pattern",
              "message": "\`pattern\` changed from '^[a-z]+$' to '^[a-z ]+$'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/pattern",
            "value": "^[a-z]+$",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "pattern",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/pattern",
            "value": "^[a-z ]+$",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/pattern",
              "message": "\`pattern\` changed from '^[a-z]+$' to '^[a-z ]+$'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a format added to a request, not to a response', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: string }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: string, format: date-time }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "format",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/format",
            "value": "date-time",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/format",
              "message": "\`format\` was set to 'date-time'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "format",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/format",
            "value": "date-time",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report closing an open request object, not an open response object', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: true }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: false }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
              "message": "\`additionalProperties\` changed from 'true' to 'false'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report opening a closed response object, not a closed request object', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: false }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: true }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": false,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "additionalProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/additionalProperties",
              "message": "\`additionalProperties\` changed from 'false' to 'true'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report an array limit that makes a request accept less, not one that lets a response send less', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: array, maxItems: 10 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: array, maxItems: 5 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxItems",
            "value": 10,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "maxItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxItems",
            "value": 5,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/maxItems",
              "message": "\`maxItems\` changed from '10' to '5'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxItems",
            "value": 10,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maxItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maxItems",
            "value": 5,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report items that must now be unique in a request', async () => {
    const config = await createConfig({ diff: { 'schema-constraint-changed': 'major' } });

    const uniqueItemsRequired = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: array }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: array, uniqueItems: true }'), 'revision.yaml'),
      config,
    });
    const uniqueItemsDeclined = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: array }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: array, uniqueItems: false }'),
        'revision.yaml'
      ),
      config,
    });

    expect(replaceSourceWithRefInChanges(uniqueItemsRequired.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "uniqueItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/uniqueItems",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/uniqueItems",
              "message": "\`uniqueItems\` was set to 'true'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "uniqueItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/uniqueItems",
            "value": true,
          },
          "verdicts": [],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(uniqueItemsDeclined.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "uniqueItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/uniqueItems",
            "value": false,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "uniqueItems",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/uniqueItems",
            "value": false,
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a const that changed on both sides, since neither accepts the other value', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ const: small }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ const: large }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/const",
            "value": "small",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "const",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/const",
            "value": "large",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/const",
              "message": "\`const\` changed from 'small' to 'large'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/const",
            "value": "small",
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "const",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/const",
            "value": "large",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/const",
              "message": "\`const\` changed from 'small' to 'large'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a subschema that constrains a request, and its removal from a response', async () => {
    const constrained = '{ type: object, not: { required: [secret] } }';
    const config = await createConfig({ diff: { 'schema-constraint-changed': 'major' } });

    const addedToRequest = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }', '{ type: object }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe(constrained, '{ type: object }'), 'revision.yaml'),
      config,
    });
    const removedFromResponse = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }', constrained), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: object }', '{ type: object }'),
        'revision.yaml'
      ),
      config,
    });

    expect(replaceSourceWithRefInChanges(addedToRequest.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/not",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/not",
            "value": {
              "required": [
                "secret",
              ],
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/not",
              "message": "\`not\` was added.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(removedFromResponse.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/not",
            "value": {
              "required": [
                "secret",
              ],
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/not",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/not",
              "message": "\`not\` was removed.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a tuple added to a request and dependent schemas removed from a response', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: array }', '{ type: object, dependentSchemas: { a: { required: [b] } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: array, prefixItems: [{ type: string }] }', '{ type: object }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/prefixItems",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/prefixItems",
            "value": [
              {
                "type": "string",
              },
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/prefixItems",
              "message": "\`prefixItems\` was added.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/dependentSchemas",
            "value": {
              "a": {
                "required": [
                  "b",
                ],
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/dependentSchemas",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/dependentSchemas",
              "message": "\`dependentSchemas\` was removed.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a property named like a keyword', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: object, properties: {} }', '{ type: object }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: object, properties: { not: { type: string } } }', '{ type: object }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/not",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/properties/not",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a closed object opened with a schema once, as accepting more', async () => {
    const config = await createConfig({ diff: { 'schema-constraint-changed': 'major' } });
    const closed = '{ type: object, unevaluatedProperties: false }';
    const opened = '{ type: object, unevaluatedProperties: { type: string } }';

    const openedInResponse = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }', closed), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: object }', opened), 'revision.yaml'),
      config,
    });
    const openedInRequest = await diffDocuments({
      base: makeDocumentFromString(cafe(closed, '{ type: object }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe(opened, '{ type: object }'), 'revision.yaml'),
      config,
    });

    expect(replaceSourceWithRefInChanges(openedInResponse.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/unevaluatedProperties",
            "value": false,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "unevaluatedProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/unevaluatedProperties",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/unevaluatedProperties",
              "message": "\`unevaluatedProperties\` was removed.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/unevaluatedProperties",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/unevaluatedProperties",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(openedInRequest.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/unevaluatedProperties",
            "value": false,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "unevaluatedProperties",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/unevaluatedProperties",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/unevaluatedProperties",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/unevaluatedProperties",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a lower bound set in a request and an upper bound removed in a response', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: integer }', '{ type: integer, maximum: 10 }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: integer, minimum: 1 }', '{ type: integer }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "minimum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
            "value": 1,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/minimum",
              "message": "Lower bound was set to '>= 1'.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/maximum",
            "value": 10,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "maximum",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema",
              "message": "Upper bound was removed.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report dependent required properties added to a request', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: object, dependentRequired: { a: [b] } }', '{ type: object }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/dependentRequired",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/dependentRequired",
            "value": {
              "a": [
                "b",
              ],
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/dependentRequired",
              "message": "\`dependentRequired\` was added.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a schema that constrains the extra properties of an open request object', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: object, additionalProperties: { type: string } }', '{ type: object }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/additionalProperties",
              "message": "\`additionalProperties\` was added.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should judge a closed tuple opened with an items schema as accepting more', async () => {
    const closed = '{ type: array, prefixItems: [{ type: string }], items: false }';
    const opened = '{ type: array, prefixItems: [{ type: string }], items: { type: string } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(closed), 'base.yaml'),
      revision: makeDocumentFromString(cafe(opened), 'revision.yaml'),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/items",
            "value": false,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema",
          "kind": "modified",
          "property": "items",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/items",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/items",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/items",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/items",
            "value": false,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema",
          "kind": "modified",
          "property": "items",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/items",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/items",
              "message": "\`items\` was removed.",
              "ruleId": "schema-constraint-changed",
            },
          ],
        },
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/responses/201/content/application~1json/schema/items",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/responses/201/content/application~1json/schema/items",
            "value": {
              "type": "string",
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should not report a lone if, which constrains nothing', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('{ type: object }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: object, if: { required: [a] } }', '{ type: object }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'schema-constraint-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1orders/post/requestBody/content/application~1json/schema/if",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/content/application~1json/schema/if",
            "value": {
              "required": [
                "a",
              ],
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
