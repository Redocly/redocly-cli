import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../../__tests__/utils.js';
import { createConfig } from '../../config/index.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { buildApiMap } from '../build-api-map.js';
import type { ApiMapNode } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('buildApiMap', () => {
  it('builds an API map mirroring the structure of an OpenAPI 3.0 document', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: Redocly Cafe
          version: 1.0.0
          description: Manage the cafe menu and orders.
        servers:
          - url: https://api.cafe.redocly.com
        tags:
          - name: Products
            description: Operations related to products
        paths:
          /menu:
            get:
              operationId: listMenuItems
              summary: List all menu items
            post:
              description: Add a menu item.
          /orders/{orderId}:
            summary: Single order operations
            get:
              operationId: getOrderById
        components:
          schemas:
            MenuItem:
              description: A menu item.
            Error: {}
          parameters: {}
        x-webhooks:
          orderStatusChanged:
            post:
              operationId: orderStatusChangedWebhook
      `,
      'cafe.yaml'
    );

    const apiMap = await buildApiMap({ document, config: await createConfig({}) });

    expect(apiMap).toEqual({
      title: 'Redocly Cafe',
      kind: 'Root',
      pointer: '#/',
      nodes: [
        {
          title: 'Redocly Cafe',
          kind: 'Info',
          pointer: '#/info',
          summary: 'Manage the cafe menu and orders.',
          nodes: [],
        },
        {
          title: 'servers',
          kind: 'ServerList',
          pointer: '#/servers',
          nodes: [
            {
              title: 'https://api.cafe.redocly.com',
              kind: 'Server',
              pointer: '#/servers/0',
              nodes: [],
            },
          ],
        },
        {
          title: 'tags',
          kind: 'TagList',
          pointer: '#/tags',
          nodes: [
            {
              title: 'Products',
              kind: 'Tag',
              pointer: '#/tags/0',
              summary: 'Operations related to products',
              nodes: [],
            },
          ],
        },
        {
          title: 'paths',
          kind: 'Paths',
          pointer: '#/paths',
          nodes: [
            {
              title: '/menu',
              kind: 'PathItem',
              pointer: '#/paths/~1menu',
              nodes: [
                {
                  title: 'listMenuItems',
                  kind: 'Operation',
                  pointer: '#/paths/~1menu/get',
                  summary: 'List all menu items',
                  method: 'get',
                  path: '/menu',
                  nodes: [],
                },
                {
                  title: 'POST /menu',
                  kind: 'Operation',
                  pointer: '#/paths/~1menu/post',
                  summary: 'Add a menu item.',
                  method: 'post',
                  path: '/menu',
                  nodes: [],
                },
              ],
            },
            {
              title: '/orders/{orderId}',
              kind: 'PathItem',
              pointer: '#/paths/~1orders~1{orderId}',
              summary: 'Single order operations',
              nodes: [
                {
                  title: 'getOrderById',
                  kind: 'Operation',
                  pointer: '#/paths/~1orders~1{orderId}/get',
                  method: 'get',
                  path: '/orders/{orderId}',
                  nodes: [],
                },
              ],
            },
          ],
        },
        {
          title: 'components',
          kind: 'Components',
          pointer: '#/components',
          nodes: [
            {
              title: 'schemas',
              kind: 'NamedSchemas',
              pointer: '#/components/schemas',
              nodes: [
                {
                  title: 'MenuItem',
                  kind: 'Schema',
                  pointer: '#/components/schemas/MenuItem',
                  summary: 'A menu item.',
                  nodes: [],
                },
                {
                  title: 'Error',
                  kind: 'Schema',
                  pointer: '#/components/schemas/Error',
                  nodes: [],
                },
              ],
            },
          ],
        },
        {
          title: 'x-webhooks',
          kind: 'WebhooksMap',
          pointer: '#/x-webhooks',
          nodes: [
            {
              title: 'orderStatusChanged',
              kind: 'PathItem',
              pointer: '#/x-webhooks/orderStatusChanged',
              nodes: [
                {
                  title: 'orderStatusChangedWebhook',
                  kind: 'Operation',
                  pointer: '#/x-webhooks/orderStatusChanged/post',
                  method: 'post',
                  nodes: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('truncates long descriptions at a word boundary', async () => {
    const description = 'word '.repeat(50).trim();
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /menu:
            get:
              operationId: listMenuItems
              description: ${description}
      `,
      'cafe.yaml'
    );

    const apiMap = await buildApiMap({ document, config: await createConfig({}) });
    const operation = apiMap.nodes.find((n) => n.title === 'paths')!.nodes[0].nodes[0];

    expect(operation.summary).toBeDefined();
    expect(operation.summary!.length).toBeLessThanOrEqual(203);
    expect(operation.summary!.endsWith('...')).toBe(true);
    const words = operation.summary!.slice(0, -3).trim().split(' ');
    expect(words.every((word) => word === 'word')).toBe(true);
  });

  it('handles OpenAPI 3.1 webhooks and pathItems and excludes $defs', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        webhooks:
          newOrder:
            post:
              operationId: onNewOrder
        components:
          pathItems:
            OrderPath:
              get:
                operationId: sharedGet
          schemas:
            Order:
              $defs:
                Status:
                  type: string
      `,
      'cafe.yaml'
    );

    const apiMap = await buildApiMap({ document, config: await createConfig({}) });
    const webhooks = apiMap.nodes.find((n) => n.title === 'webhooks');
    const components = apiMap.nodes.find((n) => n.title === 'components');

    expect(webhooks).toEqual({
      title: 'webhooks',
      kind: 'WebhooksMap',
      pointer: '#/webhooks',
      nodes: [
        {
          title: 'newOrder',
          kind: 'PathItem',
          pointer: '#/webhooks/newOrder',
          nodes: [
            {
              title: 'onNewOrder',
              kind: 'Operation',
              pointer: '#/webhooks/newOrder/post',
              method: 'post',
              nodes: [],
            },
          ],
        },
      ],
    });
    expect(components).toEqual({
      title: 'components',
      kind: 'Components',
      pointer: '#/components',
      nodes: [
        {
          title: 'schemas',
          kind: 'NamedSchemas',
          pointer: '#/components/schemas',
          nodes: [
            {
              title: 'Order',
              kind: 'Schema',
              pointer: '#/components/schemas/Order',
              nodes: [],
            },
          ],
        },
        {
          title: 'pathItems',
          kind: 'NamedPathItems',
          pointer: '#/components/pathItems',
          nodes: [
            {
              title: 'OrderPath',
              kind: 'PathItem',
              pointer: '#/components/pathItems/OrderPath',
              nodes: [],
            },
          ],
        },
      ],
    });
  });

  it('builds an API map for an OpenAPI 2.0 document', async () => {
    const document = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        info:
          title: Legacy Cafe API
          version: '1.0'
        paths:
          /orders:
            get:
              operationId: listOrders
        definitions:
          Order:
            description: A customer order.
        parameters:
          limitParam:
            name: limit
            in: query
        responses:
          NotFound:
            description: Not found
        securityDefinitions:
          api_key:
            type: apiKey
            name: key
            in: header
      `,
      'cafe.yaml'
    );

    const apiMap = await buildApiMap({ document, config: await createConfig({}) });

    expect(apiMap).toEqual({
      title: 'Legacy Cafe API',
      kind: 'Root',
      pointer: '#/',
      nodes: [
        {
          title: 'Legacy Cafe API',
          kind: 'Info',
          pointer: '#/info',
          nodes: [],
        },
        {
          title: 'paths',
          kind: 'Paths',
          pointer: '#/paths',
          nodes: [
            {
              title: '/orders',
              kind: 'PathItem',
              pointer: '#/paths/~1orders',
              nodes: [
                {
                  title: 'listOrders',
                  kind: 'Operation',
                  pointer: '#/paths/~1orders/get',
                  method: 'get',
                  path: '/orders',
                  nodes: [],
                },
              ],
            },
          ],
        },
        {
          title: 'definitions',
          kind: 'NamedSchemas',
          pointer: '#/definitions',
          nodes: [
            {
              title: 'Order',
              kind: 'Schema',
              pointer: '#/definitions/Order',
              summary: 'A customer order.',
              nodes: [],
            },
          ],
        },
        {
          title: 'parameters',
          kind: 'NamedParameters',
          pointer: '#/parameters',
          nodes: [
            {
              title: 'limitParam',
              kind: 'Parameter',
              pointer: '#/parameters/limitParam',
              nodes: [],
            },
          ],
        },
        {
          title: 'responses',
          kind: 'NamedResponses',
          pointer: '#/responses',
          nodes: [
            {
              title: 'NotFound',
              kind: 'Response',
              pointer: '#/responses/NotFound',
              summary: 'Not found',
              nodes: [],
            },
          ],
        },
        {
          title: 'securityDefinitions',
          kind: 'NamedSecuritySchemes',
          pointer: '#/securityDefinitions',
          nodes: [
            {
              title: 'api_key',
              kind: 'SecurityScheme',
              pointer: '#/securityDefinitions/api_key',
              nodes: [],
            },
          ],
        },
      ],
    });
  });

  it('keeps canonical pointers across files and adds source locations when enabled', async () => {
    const fixturesDir = path.join(__dirname, 'fixtures/multi-file');
    const externalRefResolver = new BaseResolver();
    const document = (await externalRefResolver.resolveDocument(
      null,
      path.join(fixturesDir, 'openapi.yaml'),
      true
    )) as Document;

    const apiMap = await buildApiMap({
      document,
      config: await createConfig({}),
      externalRefResolver,
      sourceLocations: true,
    });

    const relativizeSources = (node: ApiMapNode) => {
      if (node.source) {
        node.source = { ...node.source, file: path.relative(fixturesDir, node.source.file) };
      }
      node.nodes.forEach(relativizeSources);
    };
    relativizeSources(apiMap);

    const paths = apiMap.nodes.find((n) => n.title === 'paths')!;
    expect(paths.nodes).toEqual([
      {
        title: '/menu',
        kind: 'PathItem',
        pointer: '#/paths/~1menu',
        source: {
          file: 'paths/menu.yaml',
          pointer: '#/',
          startLine: 1,
          startCol: 1,
          endLine: 2,
          endCol: 30,
        },
        nodes: [
          {
            title: 'listMenuItems',
            kind: 'Operation',
            pointer: '#/paths/~1menu/get',
            method: 'get',
            path: '/menu',
            source: {
              file: 'paths/menu.yaml',
              pointer: '#/get',
              startLine: 2,
              startCol: 3,
              endLine: 2,
              endCol: 29,
            },
            nodes: [],
          },
        ],
      },
      {
        title: '/menu-archive',
        kind: 'PathItem',
        pointer: '#/paths/~1menu-archive',
        source: {
          file: 'paths/menu.yaml',
          pointer: '#/',
          startLine: 1,
          startCol: 1,
          endLine: 2,
          endCol: 30,
        },
        nodes: [
          {
            title: 'listMenuItems',
            kind: 'Operation',
            pointer: '#/paths/~1menu-archive/get',
            method: 'get',
            path: '/menu-archive',
            source: {
              file: 'paths/menu.yaml',
              pointer: '#/get',
              startLine: 2,
              startCol: 3,
              endLine: 2,
              endCol: 29,
            },
            nodes: [],
          },
        ],
      },
    ]);

    const schemas = apiMap.nodes.find((n) => n.title === 'components')!.nodes[0];
    expect(schemas.nodes).toEqual([
      {
        title: 'MenuItem',
        kind: 'Schema',
        pointer: '#/components/schemas/MenuItem',
        summary: 'A menu item.',
        source: {
          file: 'components/menu-item.yaml',
          pointer: '#/',
          startLine: 1,
          startCol: 1,
          endLine: 2,
          endCol: 27,
        },
        nodes: [],
      },
    ]);
  });

  it('excludes callback path items and nested schemas', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /orders:
            post:
              operationId: createOrder
              callbacks:
                onStatusChange:
                  '{$request.body#/callbackUrl}':
                    post:
                      operationId: statusChangeCallback
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        nested:
                          type: object
      `,
      'cafe.yaml'
    );

    const apiMap = await buildApiMap({ document, config: await createConfig({}) });
    const paths = apiMap.nodes.find((n) => n.title === 'paths')!;

    expect(paths.nodes).toEqual([
      {
        title: '/orders',
        kind: 'PathItem',
        pointer: '#/paths/~1orders',
        nodes: [
          {
            title: 'createOrder',
            kind: 'Operation',
            pointer: '#/paths/~1orders/post',
            method: 'post',
            path: '/orders',
            nodes: [],
          },
        ],
      },
    ]);
    expect(JSON.stringify(apiMap)).not.toContain('statusChangeCallback');
  });

  it('derives summaries from structure when descriptions are missing', async () => {
    const oasDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /menu:
            get:
              operationId: listMenuItems
              parameters:
                - name: limit
                  in: query
                - $ref: '#/components/parameters/Sort'
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/MenuItemList'
                '404': {}
        components:
          parameters:
            Sort:
              name: sort
              in: query
          schemas:
            MenuItemList:
              type: array
              items:
                $ref: '#/components/schemas/MenuItem'
            MenuItem:
              type: object
              properties:
                name:
                  type: string
                price:
                  type: number
      `,
      'cafe.yaml'
    );

    const oasMap = await buildApiMap({ document: oasDocument, config: await createConfig({}) });
    const operation = oasMap.nodes.find((n) => n.title === 'paths')!.nodes[0].nodes[0];
    const schemas = oasMap.nodes
      .find((n) => n.title === 'components')!
      .nodes.find((n) => n.title === 'schemas')!;

    expect(operation.summary).toBe('Returns 200 (MenuItemList), 404. Parameters: limit, Sort.');
    expect(schemas.nodes.find((n) => n.title === 'MenuItemList')!.summary).toBe(
      'array of MenuItem'
    );
    expect(schemas.nodes.find((n) => n.title === 'MenuItem')!.summary).toBe('object: name, price');

    const async2Document = parseYamlToDocument(
      outdent`
        asyncapi: 2.6.0
        info:
          title: Cafe Events
          version: 1.0.0
        channels:
          orders/created:
            subscribe:
              operationId: onOrderCreated
              message:
                $ref: '#/components/messages/OrderCreated'
        components:
          messages:
            OrderCreated:
              payload:
                type: object
      `,
      'cafe-events.yaml'
    );

    const async2Map = await buildApiMap({
      document: async2Document,
      config: await createConfig({}),
    });
    const async2Operation = async2Map.nodes.find((n) => n.title === 'channels')!.nodes[0].nodes[0];
    expect(async2Operation.summary).toBe('message: OrderCreated');

    const async3Document = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Cafe Events
          version: 1.0.0
        channels:
          ordersCreated:
            address: orders/created
        operations:
          sendOrderCreated:
            action: send
            channel:
              $ref: '#/channels/ordersCreated'
      `,
      'cafe-events.yaml'
    );

    const async3Map = await buildApiMap({
      document: async3Document,
      config: await createConfig({}),
    });
    const async3Operation = async3Map.nodes.find((n) => n.title === 'operations')!.nodes[0];
    expect(async3Operation.summary).toBe('send to ordersCreated');
  });

  it('throws for unsupported spec versions', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.0.1
        info:
          title: Cafe Workflows
          version: 1.0.0
        sourceDescriptions: []
        workflows: []
      `,
      'cafe-workflows.yaml'
    );

    await expect(buildApiMap({ document, config: await createConfig({}) })).rejects.toThrow(
      'Unsupported spec version'
    );
  });
});
