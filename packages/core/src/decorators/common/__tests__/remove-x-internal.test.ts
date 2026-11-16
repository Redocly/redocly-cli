import { outdent } from 'outdent';

import { parseYamlToDocument, yamlSerializer } from '../../../../__tests__/utils.js';
import { bundleDocument } from '../../../bundle/bundle-document.js';
import { createConfig } from '../../../config/index.js';
import { Oas3Types, Oas2Types } from '../../../index.js';
import { BaseResolver } from '../../../resolve.js';

describe('oas3 remove-x-internal', () => {
  expect.addSnapshotSerializer(yamlSerializer);
  const testDocument = parseYamlToDocument(
    outdent`
      openapi: 3.0.0
      paths:
        /pet:
          removeit: true
          get:
            parameters:
              - $ref: '#/components/parameters/x'
      components:
        parameters:
          x:
            name: x
    `
  );

  it('should use `internalFlagProperty` option to remove internal paths', async () => {
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': { internalFlagProperty: 'removeit' } },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
          openapi: 3.0.0
          components:
            parameters:
              x:
                name: x

        `);
  });

  it('should clean types: Server, Operation, Parameter, PathItem, Example', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        servers:
          - url: //petstore.swagger.io/v2
            description: Default server
            x-internal: true
        paths:
          /pet:
            get:
              x-internal: true
              operationId: getPet
              parameters:
                - $ref: '#/components/parameters/x'
            put:
              parameters:
                - name: Accept-Language
                  x-internal: true
                  in: header
                  example: en-US
                  required: false
                - name: cookieParam
                  x-internal: true
                  in: cookie
                  description: Some cookie
                  required: true
          /admin:
            x-internal: true
            post:
              parameters:
                - $ref: '#/components/parameters/y'
          /store/order:
            post:
              operationId: placeOrder
              responses:
                '200':
                  description: successful operation
                  content:
                    application/json:
                      examples:
                        response:
                          x-internal: true
                          value: OK
        components:
          parameters:
            x:
              name: x
            y:
              name: y
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /pet:
          put: {}
        /store/order:
          post:
            operationId: placeOrder
            responses:
              '200':
                description: successful operation
                content:
                  application/json: {}
      components:
        parameters:
          x:
            name: x
          'y':
            name: 'y'

      `);
  });

  it('should clean types: Schema, Response, RequestBody, MediaType, Callback', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /pet:
            post:
              summary: test
              requestBody:
                x-internal: true
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
          /store/order:
            post:
              operationId: storeOrder
              parameters:
                - name: api_key
                  schema:
                    x-internal: true
                    type: string
              responses:
                '200':
                  x-internal: true
                  content:
                    application/json:
                      examples:
                        response:
                          value: OK
              requestBody:
                content:
                  application/x-www-form-urlencoded:
                    x-internal: true
                    schema:
                      type: object
              callbacks:
                orderInProgress:
                  x-internal: true
                  '{$request.body#/callbackUrl}?event={$request.body#/eventName}':
                    servers:
                      - url: //callback-url.path-level/v1
                        description: Path level server
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /pet:
          post:
            summary: test
        /store/order:
          post:
            operationId: storeOrder
            parameters:
              - name: api_key
            requestBody: {}
      components: {}

      `);
  });

  it('should remove refs', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.1
        info:
          version: 1.0.0
          title: Test API
        paths:
          /test1:
            get:
              parameters:
                - $ref: '#/components/parameters/Internal'
                - in: query
                  name: inline
                  schema:
                    type: string
                - in: query
                  name: inline-internal
                  schema:
                    type: string
                  x-internal: true
          /test2:
            get:
              parameters:
                - $ref: '#/components/parameters/Public'
                - $ref: '#/components/parameters/Internal'
              requestBody:
                $ref: '#/components/requestBodies/Public'
        components:
          requestBodies:
            Public:
              content:
                application/json:
                  schema:
                    type: string
              required: true
              x-internal: true
          parameters:
            Public:
              in: path
              name: product_id
              schema:
                type: string
            Internal:
              in: header
              name: X-Vendor
              schema:
                type: string
              x-internal: true
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.1
      info:
        version: 1.0.0
        title: Test API
      paths:
        /test1:
          get:
            parameters:
              - in: query
                name: inline
                schema:
                  type: string
        /test2:
          get:
            parameters:
              - $ref: '#/components/parameters/Public'
      components:
        parameters:
          Public:
            in: path
            name: product_id
            schema:
              type: string

    `);
  });

  it('should remove $refs and the corresponding discriminator mapping', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info: {}
        paths:
          /test:
            post:
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/christmas-tree'
        components:
          schemas:
            christmas-tree:
              type: array
              items:
                discriminator:
                  propertyName: type
                  mapping:
                    candy-cane: '#/components/schemas/candy-cane'
                    popcorn: '#/components/schemas/popcorn'
                    cranberry: '#/components/schemas/cranberry'
                anyOf:
                  - $ref: '#/components/schemas/candy-cane'
                  - $ref: '#/components/schemas/popcorn'
                  - $ref: '#/components/schemas/cranberry'
            candy-cane:
              x-internal: true
              title: candy-cane
              type: object
              properties:
                type:
                  type: string
                  enum: [candy-cane]
            popcorn:
              type: object
              properties:
                type:
                  type: string
                  enum: [popcorn]
            cranberry:
              type: object
              properties:
                type:
                  type: string
                  enum: [cranberry]
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      info: {}
      paths:
        /test:
          post:
            requestBody:
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/christmas-tree'
      components:
        schemas:
          christmas-tree:
            type: array
            items:
              discriminator:
                propertyName: type
                mapping:
                  popcorn: '#/components/schemas/popcorn'
                  cranberry: '#/components/schemas/cranberry'
              anyOf:
                - $ref: '#/components/schemas/popcorn'
                - $ref: '#/components/schemas/cranberry'
          popcorn:
            type: object
            properties:
              type:
                type: string
                enum:
                  - popcorn
          cranberry:
            type: object
            properties:
              type:
                type: string
                enum:
                  - cranberry

    `);
  });

  it('should remove security requirements that use a removed security scheme', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        security:
          - InternalKey: []
          - ApiKey: []
        paths:
          /orders:
            get:
              security:
                - InternalKey: []
                  ApiKey: []
                - OAuth: [read]
            post:
              security:
                - InternalKey: []
          /menu:
            get:
              security: []
        components:
          securitySchemes:
            InternalKey:
              x-internal: true
              type: apiKey
              name: X-Internal-Key
              in: header
            ApiKey:
              type: apiKey
              name: X-Api-Key
              in: header
            OAuth:
              type: oauth2
              flows: {}
          schemas:
            OAuth:
              x-internal: true
              type: object
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      security:
        - ApiKey: []
      paths:
        /orders:
          get:
            security:
              - OAuth:
                  - read
          post: {}
        /menu:
          get:
            security: []
      components:
        securitySchemes:
          ApiKey:
            type: apiKey
            name: X-Api-Key
            in: header
          OAuth:
            type: oauth2
            flows: {}
    `);
  });

  it('should remove security requirements that use a security scheme named like an Object property', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /orders:
            get:
              security:
                - constructor: []
                - toString: []
        components:
          securitySchemes:
            constructor:
              x-internal: true
              type: apiKey
              name: X-Internal-Key
              in: header
            toString:
              type: apiKey
              name: X-Api-Key
              in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /orders:
          get:
            security:
              - toString: []
      components:
        securitySchemes:
          toString:
            type: apiKey
            name: X-Api-Key
            in: header
    `);
  });

  it('should remove security requirements that use a security scheme referencing an internal one', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /orders:
            get:
              security:
                - ApiKey: []
                - Alias: []
                - InternalKey: []
        components:
          securitySchemes:
            Alias:
              $ref: '#/components/securitySchemes/InternalKey'
            InternalKey:
              x-internal: true
              type: apiKey
              name: X-Internal-Key
              in: header
            ApiKey:
              type: apiKey
              name: X-Api-Key
              in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /orders:
          get:
            security:
              - ApiKey: []
      components:
        securitySchemes:
          ApiKey:
            type: apiKey
            name: X-Api-Key
            in: header
    `);
  });

  it('should remove security requirements that use schemes from a removed securitySchemes map', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /orders:
            get:
              security:
                - InternalKey: []
                - {}
        components:
          securitySchemes:
            x-internal: true
            InternalKey:
              type: apiKey
              name: X-Internal-Key
              in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /orders:
          get:
            security:
              - {}
    `);
  });

  it('should remove security requirements that use schemes from removed components', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        security:
          - InternalKey: []
        paths:
          /orders:
            get:
              security:
                - InternalKey: []
                - {}
        components:
          x-internal: true
          securitySchemes:
            InternalKey:
              type: apiKey
              name: X-Internal-Key
              in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /orders:
          get:
            security:
              - {}
      components: {}
    `);
  });
});

describe('oas2 remove-x-internal', () => {
  it('should clean types - base test', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        host: api.instagram.com
        paths:
          '/geographies/{geo-id}/media/recent':
            get:
              parameters:
                - description: The geography ID.
                  x-internal: true
                  in: path
                  name: geo-id
                  required: true
                  type: string
                - description: Max number of media to return.
                  x-internal: true
                  format: int32
                  in: query
                  name: count
                  required: false
                  type: integer
              responses:
                '200':
                  x-internal: true
                  description: List of recent media entries.
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas2Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
          swagger: '2.0'
          host: api.instagram.com
          paths:
            /geographies/{geo-id}/media/recent:
              get: {}

        `);
  });

  it('should remove security requirements that use a removed security definition', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        security:
          - InternalKey: []
        paths:
          /orders:
            get:
              security:
                - InternalKey: []
                - ApiKey: []
        securityDefinitions:
          InternalKey:
            x-internal: true
            type: apiKey
            name: X-Internal-Key
            in: header
          ApiKey:
            type: apiKey
            name: X-Api-Key
            in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas2Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      swagger: '2.0'
      paths:
        /orders:
          get:
            security:
              - ApiKey: []
      securityDefinitions:
        ApiKey:
          type: apiKey
          name: X-Api-Key
          in: header
    `);
  });

  it('should remove security requirements that use schemes from removed securityDefinitions', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        security:
          - InternalKey: []
        paths:
          /orders:
            get:
              security:
                - InternalKey: []
                - {}
        securityDefinitions:
          x-internal: true
          InternalKey:
            type: apiKey
            name: X-Internal-Key
            in: header
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'remove-x-internal': 'on' },
      }),
      types: Oas2Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      swagger: '2.0'
      paths:
        /orders:
          get:
            security:
              - {}
    `);
  });
});
