import { outdent } from 'outdent';

import {
  replaceSourceWithRef,
  replaceSourceWithRefInChanges,
  resolverWithFiles,
} from '../../../__tests__/utils.js';
import { createConfig, type Config } from '../../config/index.js';
import { makeDocumentFromString, type Document } from '../../resolve.js';
import { HandledError } from '../../utils/error.js';
import type { Oas3Preprocessor } from '../../visitors.js';
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
  it('should not judge a component by a place that only the revision has', async () => {
    const placeOrder = outdent`
      { /orders: { post: {
        requestBody: { content: { application/json: { schema: { $ref: '#/components/schemas/OrderStatus' } } } },
        responses: { 201: { description: Created } } } } }
    `;

    const result = await diffDocuments({
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
          "impact": "patch",
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
          "verdicts": [],
        },
      ]
    `);
  });

  it('should judge a part only the base has by the base, not by what the revision marks above it', async () => {
    const orders = (meta: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: { type: object, properties: { meta: ${meta} } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(
        orders('{ type: object, properties: { a: { type: string }, b: { type: string } } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        orders('{ type: object, writeOnly: true, properties: { a: { type: string } } }'),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes.find((change) => change.kind === 'removed')).toMatchObject({
      key: '#/paths/~1orders/get/responses/200/content/application~1json/schema/properties/meta/properties/b',
      impact: 'major',
      verdicts: [{ ruleId: 'property-removed' }],
    });
  });

  it('should judge a component under a $ref with keys next to it in the direction of its place', async () => {
    const placeOrder = outdent`
      { /orders: { post: {
        requestBody: { content: { application/json: { schema: { $ref: '#/components/schemas/OrderStatus', description: The first status } } } },
        responses: { 201: { description: Created } } } } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(
        orderStatus(placeOrder, '[placed, preparing, ready]'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(orderStatus(placeOrder, '[placed, ready]'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes).toMatchObject([
      {
        kind: 'modified',
        property: 'enum',
        impact: 'major',
        verdicts: [{ ruleId: 'enum-values-removed' }],
      },
    ]);
  });

  it('should pair reordered parameters by their content and judge only what changed', async () => {
    const result = await diffDocuments({
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
          "key": "#/paths/~1menu/get/parameters/1",
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
          "key": "#/paths/~1menu/get/parameters/1/schema",
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
    const result = await diffDocuments({
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
          "key": "#/paths/~1menu~1{menuItemId}",
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
          "key": "#/paths/~1menu~1{menuItemId}/get/parameters/0",
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

  it('should find no change where an inline schema moved into a component that a $ref with a description points to', async () => {
    const cafe = (schema: string, schemas: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /menu:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema: ${schema}
      components:
        schemas: ${schemas}
    `;
    const item = '{ type: object, properties: { name: { type: string } } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(item, '{}'), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe("{ $ref: '#/components/schemas/Item', description: A dish }", `{ Item: ${item} }`),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes.map(({ key, kind, impact }) => ({ key, kind, impact }))).toEqual([
      { key: '#/components/schemas/Item', kind: 'added', impact: 'patch' },
    ]);
  });

  it('should leave the change of info.version out of the required bump', async () => {
    const cafe = (version: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: ${version} }
      paths: {}
    `;

    const result = await diffDocuments({
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

    const result = await diffDocuments({
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

  it('should name a header added to a Swagger 2 response by its key in the headers map', async () => {
    const swagger = (headers: string) => outdent`
      swagger: '2.0'
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /menu:
          get:
            responses:
              '200': { description: OK, headers: ${headers} }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(swagger('{ X-Request-Id: { type: string } }'), 'base.yaml'),
      revision: makeDocumentFromString(
        swagger('{ X-Request-Id: { type: string }, X-Rate-Limit: { type: integer } }'),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes).toMatchObject([
      {
        key: '#/paths/~1menu/get/responses/200/headers/X-Rate-Limit',
        kind: 'added',
        node: { revision: { key: 'X-Rate-Limit' } },
      },
    ]);
  });

  it('should judge the request body of a webhook in a file of its own as data the API sends', async () => {
    const orderReady = (properties: string) => outdent`
      post:
        requestBody:
          content:
            application/json:
              schema: { type: object, properties: ${properties} }
        responses:
          '200': { description: OK }
    `;
    const root = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      webhooks:
        orderReady: { $ref: webhooks/order-ready.yaml }
    `;
    const resolver = resolverWithFiles({
      'base/openapi.yaml': root,
      'base/webhooks/order-ready.yaml': orderReady(
        '{ id: { type: string }, note: { type: string } }'
      ),
      'revision/openapi.yaml': root,
      'revision/webhooks/order-ready.yaml': orderReady('{ id: { type: string } }'),
    });
    const load = async (side: 'base' | 'revision') =>
      (await resolver.resolveDocument(null, `${side}/openapi.yaml`, true)) as Document;

    const result = await diffDocuments({
      base: await load('base'),
      revision: await load('revision'),
      config: await createConfig({ extends: ['diff-recommended'] }),
      externalRefResolver: resolver,
    });

    expect(result.changes).toMatchObject([
      {
        key: '#/webhooks/orderReady/post/requestBody/content/application~1json/schema/properties/note',
        kind: 'removed',
        impact: 'major',
        verdicts: [{ ruleId: 'property-removed' }],
      },
    ]);
  });

  it('should judge the target of a chain of $refs with keys next to them in the direction of the path that uses it', async () => {
    const item = (type: string) => outdent`
      get:
        responses:
          '200':
            description: OK
            content:
              application/json:
                schema: { type: ${type} }
        callbacks:
          onEvent:
            '{$request.body#/url}': { $ref: '#' }
    `;
    const root = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /menu: { $ref: ./menu.yaml }
    `;
    const menu = '{ $ref: ./item.yaml, summary: Menu }';
    const resolver = resolverWithFiles({
      'base/openapi.yaml': root,
      'base/menu.yaml': menu,
      'base/item.yaml': item('string'),
      'revision/openapi.yaml': root,
      'revision/menu.yaml': menu,
      'revision/item.yaml': item('integer'),
    });
    const load = async (side: 'base' | 'revision') =>
      (await resolver.resolveDocument(null, `${side}/openapi.yaml`, true)) as Document;

    const result = await diffDocuments({
      base: await load('base'),
      revision: await load('revision'),
      config: await createConfig({ extends: ['diff-recommended'] }),
      externalRefResolver: resolver,
    });

    expect(result.changes).toMatchObject([
      {
        key: '#/paths/~1menu/$ref/get/responses/200/content/application~1json/schema',
        kind: 'modified',
        property: 'type',
        impact: 'major',
        verdicts: [
          { ruleId: 'schema-type-changed', message: "Type widened from 'string' to 'integer'." },
        ],
      },
    ]);
  });

  it("should judge a callback's $ref to a path's request body as a request", async () => {
    const cafe = (required: string) => outdent`
      openapi: 3.0.3
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            responses: { '200': { description: OK } }
            callbacks:
              done:
                '{$request.body#/url}':
                  post:
                    requestBody: { $ref: '#/paths/~1receipts/post/requestBody' }
                    responses: { '200': { description: OK } }
        /receipts:
          post:
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    required: ${required}
                    properties: { id: { type: string }, total: { type: number } }
            responses: { '200': { description: OK } }
    `;

    const result = await diffDocuments({
      base: makeDocumentFromString(cafe('[id]'), 'base.yaml'),
      revision: makeDocumentFromString(cafe('[id, total]'), 'revision.yaml'),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(result.changes).toMatchObject([
      {
        key: '#/paths/~1orders/post/callbacks/done/{$request.body#~1url}/post/requestBody/content/application~1json/schema',
        kind: 'modified',
        property: 'required',
        impact: 'major',
        verdicts: [{ ruleId: 'required-properties-added' }],
      },
    ]);
  });

  it('should refuse to compare documents of different specifications', async () => {
    const swagger = outdent`
      swagger: '2.0'
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
    `;
    const config = await createConfig({ extends: ['diff-recommended'] });

    await expect(
      diffDocuments({
        base: makeDocumentFromString(swagger, 'base.yaml'),
        revision: makeDocumentFromString(menu('[]'), 'revision.yaml'),
        config,
      })
    ).rejects.toThrow(HandledError);
  });

  it('should report a $ref that does not resolve as an error', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(menu('[]'), 'base.yaml'),
      revision: makeDocumentFromString(
        menu("[{ $ref: '#/components/parameters/Limit' }]"),
        'revision.yaml'
      ),
      config: await createConfig({ extends: ['diff-recommended'] }),
    });

    expect(replaceSourceWithRef(result.problems)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1menu/get/parameters/0",
              "reportOnKey": false,
              "source": "revision.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
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

    const [cancelRemoved] = (await diffDocuments({ base, revision, config })).changes;

    expect(cancelRemoved.impact).toBe('major');
  });

  it('should let the diff map override a preset', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      diff: { 'operation-removed': 'minor' },
    });

    const [cancelRemoved] = (await diffDocuments({ base, revision, config })).changes;

    expect(cancelRemoved.impact).toBe('minor');
  });

  it('should let a specification block override a preset', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      oas3_1Diff: { 'operation-removed': 'minor' },
    });

    const [cancelRemoved] = (await diffDocuments({ base, revision, config })).changes;

    expect(cancelRemoved.impact).toBe('minor');
  });

  it('should leave a change unjudged when its rule is off', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      diff: { 'operation-removed': 'off' },
    });

    const [cancelRemoved] = (await diffDocuments({ base, revision, config })).changes;

    expect(cancelRemoved.impact).toBe('patch');
  });

  it('should run only the listed rules when no preset is extended', async () => {
    const config = await createConfig({ diff: { 'path-removed': 'major' } });

    const [cancelRemoved] = (await diffDocuments({ base, revision, config })).changes;

    expect(cancelRemoved.impact).toBe('patch');
  });

  it('should compare the descriptions as written, without the configured decorators', async () => {
    const config = await createConfig({
      extends: ['diff-recommended'],
      decorators: { 'remove-x-internal': 'on' },
    });
    const withKitchen = makeDocumentFromString(
      outdent`
        openapi: 3.1.0
        info: { title: Cafe, version: 1.0.0 }
        paths:
          /orders/{orderId}: { ${get}, ${cancel} }
          /kitchen:
            x-internal: true
            get: { responses: { 200: { description: OK } } }
      `,
      'revision.yaml'
    );

    const result = await diffDocuments({ base, revision: withKitchen, config });

    expect(result.changes.map(({ key, kind }) => ({ key, kind }))).toEqual([
      { key: '#/paths/~1kitchen', kind: 'added' },
    ]);
  });
});

describe('diffDocuments of a document that another file refers back into', () => {
  const cafe = (costType: string) => outdent`
    openapi: 3.1.0
    info: { title: Cafe, version: 1.0.0 }
    paths:
      /menu:
        get:
          responses:
            '200':
              description: OK
              content:
                application/json:
                  schema: { $ref: schemas/item.yaml }
    components:
      schemas:
        Price:
          type: object
          properties:
            amount: { type: number }
            cost: { type: ${costType} }
  `;

  // `schemas/item.yaml` uses `Price` from the root; the revision changes `Price.cost`.
  async function diffCafes(config: Config) {
    const item = "properties: { price: { $ref: '../openapi.yaml#/components/schemas/Price' } }";
    const resolver = resolverWithFiles({
      'base/openapi.yaml': cafe('number'),
      'base/schemas/item.yaml': item,
      'revision/openapi.yaml': cafe('string'),
      'revision/schemas/item.yaml': item,
    });
    const load = async (side: 'base' | 'revision') =>
      (await resolver.resolveDocument(null, `${side}/openapi.yaml`, true)) as Document;

    const result = await diffDocuments({
      base: await load('base'),
      revision: await load('revision'),
      config,
      externalRefResolver: resolver,
    });
    return result;
  }

  it('should compare what the preprocessors left of it', async () => {
    // It changes `Price` from the components map, which the `$ref` in `item.yaml` does not pass through.
    const removeCost: Oas3Preprocessor = () => ({
      NamedSchemas: {
        leave(schemas) {
          delete schemas.Price?.properties?.cost;
        },
      },
    });

    const result = await diffCafes(
      await createConfig({
        plugins: [{ id: 'cafe', preprocessors: { oas3: { 'remove-cost': removeCost } } }],
        preprocessors: { 'cafe/remove-cost': 'on' },
      })
    );

    expect(result.changes).toEqual([]);
  });
});
