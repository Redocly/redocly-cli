import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../__tests__/utils.js';
import { createConfig } from '../../config/index.js';
import { makeDocumentFromString } from '../../resolve.js';
import { HandledError } from '../../utils/error.js';
import { diffDocuments } from '../index.js';

const orderStatus = (paths: string, statuses: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: ${paths}
  components:
    schemas:
      OrderStatus: { type: string, enum: ${statuses} }
`;

const menu = (parameters: string, description = 'OK') => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        parameters: ${parameters}
        responses:
          '200': { description: ${description} }
`;

const menuItem = (template: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu/{${template}}:
      get:
        parameters:
          - { name: ${template}, in: path, required: true, schema: { type: string } }
        responses:
          '200': { description: OK }
`;

describe('diffDocuments', () => {
  it('should judge a component in the direction a site added in the revision uses it', async () => {
    const placeOrder = outdent`
      { /orders: { post: {
        requestBody: { content: { application/json: { schema: { $ref: '#/components/schemas/OrderStatus' } } } },
        responses: { 201: { description: Created } } } } }
    `;

    const result = diffDocuments({
      base: makeDocumentFromString(orderStatus('{}', '[placed, preparing, ready]'), 'base.yaml'),
      revision: makeDocumentFromString(orderStatus(placeOrder, '[placed, ready]'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1orders",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1orders",
            "value": {
              "post": {
                "requestBody": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/OrderStatus",
                      },
                    },
                  },
                },
                "responses": {
                  "201": {
                    "description": "Created",
                  },
                },
              },
            },
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/schemas/OrderStatus/enum",
            "value": [
              "placed",
              "preparing",
              "ready",
            ],
          },
          "impact": "major",
          "key": "#/components/schemas/OrderStatus",
          "kind": "modified",
          "property": "enum",
          "revision": {
            "location": "revision.yaml#/components/schemas/OrderStatus/enum",
            "value": [
              "placed",
              "ready",
            ],
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/schemas/OrderStatus/enum",
              "message": "Enum of \`OrderStatus\` lost values: 'preparing'.",
              "ruleId": "enum-values-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should match reordered parameters by name and judge only what changed', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        menu(
          '[{ name: limit, in: query, schema: { type: integer } }, { name: search, in: query }]'
        ),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        menu(
          '[{ name: search, in: query }, { name: limit, in: query, required: true, schema: { type: number } }]',
          'Menu items'
        ),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
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
            "location": "revision.yaml#/paths/~1menu/get/parameters/1/required",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/parameters/1/required",
              "message": "\`limit\` query parameter became required.",
              "ruleId": "parameter-became-required",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/parameters/0/schema/type",
            "value": "integer",
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get/parameters/{query:limit}/schema",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/parameters/1/schema/type",
            "value": "number",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/responses/200/description",
            "value": "OK",
          },
          "impact": "patch",
          "key": "#/paths/~1menu/get/responses/200",
          "kind": "modified",
          "property": "description",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/responses/200/description",
            "value": "Menu items",
          },
          "verdicts": [],
        },
      ]
    `);
    expect(result.summary).toEqual({ major: 1, minor: 0, patch: 2 });
    expect(result.bump).toBe('major');
  });

  it('should report a renamed path parameter as a change of key and name, not a removal', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(menuItem('id'), 'base.yaml'),
      revision: makeDocumentFromString(menuItem('menuItemId'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{id}",
            "value": "/menu/{id}",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{0}",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{menuItemId}",
            "value": "/menu/{menuItemId}",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/paths/~1menu~1{id}/get/parameters/0/name",
            "value": "id",
          },
          "impact": "patch",
          "key": "#/paths/~1menu~1{0}/get/parameters/{path:0}",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{menuItemId}/get/parameters/0/name",
            "value": "menuItemId",
          },
          "verdicts": [],
        },
      ]
    `);
    expect(result.bump).toBe('patch');
  });

  it('should number a second path of the same shape, which the specification forbids', async () => {
    const cafe = (paths: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: ${paths}
    `;
    const item = (template: string) =>
      `'/menu/{${template}}': { get: { responses: { 200: { description: OK } } } }`;

    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${item('menuItemId')} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe(`{ ${item('menuItemId')}, ${item('itemId')} }`),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "impact": "minor",
          "key": "#/paths/~1menu~1{0}#2",
          "kind": "added",
          "revision": {
            "location": "revision.yaml#/paths/~1menu~1{itemId}",
            "value": {
              "get": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should leave the change of info.version out of the required bump', async () => {
    const cafe = (version: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: ${version} }
      paths: {}
    `;

    const result = diffDocuments({
      base: makeDocumentFromString(cafe('1.0.0'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('2.0.0'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes).toHaveLength(1);
    expect(result.bump).toBeUndefined();
  });

  it('should compare a specification without diff rules by its structure alone', async () => {
    const swagger = (paths: string) => outdent`
      swagger: '2.0'
      info: { title: Cafe, version: 1.0.0 }
      paths: ${paths}
    `;

    const result = diffDocuments({
      base: makeDocumentFromString(
        swagger('{ /menu: { get: { responses: { 200: { description: OK } } } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(swagger('{}'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu",
            "value": {
              "get": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "patch",
          "key": "#/paths/~1menu",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });

  it('should refuse to compare documents of different specifications', async () => {
    const swagger = outdent`
      swagger: '2.0'
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
    `;
    const config = await createConfig({ extends: ['diff-recommended'] });

    const compare = () =>
      diffDocuments({
        base: makeDocumentFromString(swagger, 'base.yaml'),
        revision: makeDocumentFromString(menu('[]'), 'revision.yaml'),
        config,
      });

    expect(compare).toThrow(HandledError);
  });
});

describe('diffDocuments configuration', () => {
  const orders = (operations: string) => outdent`
    openapi: 3.1.0
    info: { title: Cafe, version: 1.0.0 }
    paths:
      /orders/{orderId}: ${operations}
  `;
  const get = 'get: { responses: { 200: { description: OK } } }';
  const cancel = 'delete: { responses: { 204: { description: Cancelled } } }';
  const base = makeDocumentFromString(orders(`{ ${get}, ${cancel} }`), 'base.yaml');
  const revision = makeDocumentFromString(orders(`{ ${get} }`), 'revision.yaml');

  it('should take the impacts of diff-recommended', async () => {
    const config = await createConfig({ extends: ['diff-recommended'] });

    const [cancelRemoved] = diffDocuments({ base, revision, config }).changes;

    expect(cancelRemoved.impact).toBe('major');
  });

  it('should let the diff map override a preset', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      diff: { 'operation-removed': 'minor' },
    });

    const [cancelRemoved] = diffDocuments({ base, revision, config }).changes;

    expect(cancelRemoved.impact).toBe('minor');
  });

  it('should let a specification block override a preset', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      oas3_1Diff: { 'operation-removed': 'minor' },
    });

    const [cancelRemoved] = diffDocuments({ base, revision, config }).changes;

    expect(cancelRemoved.impact).toBe('minor');
  });

  it('should leave a change unjudged when its rule is off', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      diff: { 'operation-removed': 'off' },
    });

    const [cancelRemoved] = diffDocuments({ base, revision, config }).changes;

    expect(cancelRemoved.impact).toBe('patch');
  });

  it('should run only the listed rules when no preset is extended', async () => {
    const config = await createConfig({ diff: { 'path-removed': 'major' } });

    const [cancelRemoved] = diffDocuments({ base, revision, config }).changes;

    expect(cancelRemoved.impact).toBe('patch');
  });
});
