import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (quantity: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          content:
            application/json:
              schema: ${quantity}
        responses:
          '201':
            description: Created
            content:
              application/json:
                schema: ${quantity}
`;

describe('numeric-range-changed', () => {
  it('should report a bound that makes a request accept less, not one that lets a response send less', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, maximum: 20 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, maximum: 10 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
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
              "ruleId": "numeric-range-changed",
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
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: integer, minimum: 1 }'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('{ type: integer, minimum: 0 }'), 'revision.yaml'),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
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
              "ruleId": "numeric-range-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report an OpenAPI 3.0 bound written the OpenAPI 3.1 way', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: number, minimum: 0, exclusiveMinimum: true }').replace('3.1.0', '3.0.3'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: number, exclusiveMinimum: 0 }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
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
    const result = diffDocuments({
      base: makeDocumentFromString(cafe('{ type: number, minimum: 0 }'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ type: number, exclusiveMinimum: 0 }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'numeric-range-changed': 'major' } }),
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
              "ruleId": "numeric-range-changed",
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
});
