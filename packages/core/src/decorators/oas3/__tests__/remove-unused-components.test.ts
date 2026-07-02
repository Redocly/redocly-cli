import * as path from 'node:path';
import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../../../__tests__/utils.js';
import { bundleDocument } from '../../../bundle/bundle-document.js';
import { bundle } from '../../../bundle/bundle.js';
import { createConfig } from '../../../config/index.js';
import { Oas3Types, Oas3_2Types } from '../../../index.js';
import { BaseResolver } from '../../../resolve.js';

describe('oas3 remove-unused-components', () => {
  it('should remove unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              parameters:
                - $ref: '#/components/parameters/used'
        components:
          parameters:
            used:
              name: used
            unused:
              name: unused
          responses:
            unused: {}
          examples:
            unused: {}
          requestBodies:
            unused: {}
          headers:
            unused: {}
          schemas:
            Unused:
              type: integer
              enum:
                - 1
                - 2
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toEqual({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              {
                $ref: '#/components/parameters/used',
              },
            ],
          },
        },
      },
      components: {
        parameters: {
          used: {
            name: 'used',
          },
        },
      },
    });
  });

  it('should not remove components used child reference', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          parameters:
            unused:
              name: unused
          responses:
            unused: {}
          examples:
            unused: {}
          requestBodies:
            unused: {}
          headers:
            unused: {}
          schemas:
            InnerUsed:
              type: object
              properties:
                link:
                  type: string
            Used:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/InnerUsed/properties/link'
            Unused:
              type: integer
              enum:
                - 1
                - 2
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toEqual({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Used',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          InnerUsed: {
            type: 'object',
            properties: {
              link: {
                type: 'string',
              },
            },
          },
          Used: {
            type: 'object',
            properties: {
              link: {
                $ref: '#/components/schemas/InnerUsed/properties/link',
              },
            },
          },
        },
      },
    });
  });

  it('should remove transitively unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              parameters:
                - $ref: '#/components/parameters/used'
        components:
          parameters:
            used:
              name: used
            unused:
              name: unused
          schemas:
            Unused:
              type: integer
              enum:
                - 1
                - 2
            Transitive:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Unused'
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toEqual({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              {
                $ref: '#/components/parameters/used',
              },
            ],
          },
        },
      },
      components: {
        parameters: {
          used: {
            name: 'used',
          },
        },
      },
    });
  });

  it('should remove transitively unused components with colliding paths', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              responses: 
                200:
                  content: 
                    application/json: 
                      schema: 
                        $ref: "#/components/schemas/Transitive2"
        components:
          schemas:
            Unused: # <-- this will be removed correctly
              type: integer
            Transitive: # <-- this will be removed correctly
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Unused'
            Used:
              type: integer
            Transitive2:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Used'
        `,

      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toEqual({
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Transitive2',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Transitive2: {
            type: 'object',
            properties: {
              link: {
                $ref: '#/components/schemas/Used',
              },
            },
          },
          Used: {
            type: 'integer',
          },
        },
      },
    });
  });

  it('should report invalid ref errors', async () => {
    const { problems } = await bundle({
      ref: path.join(__dirname, 'fixtures/handle-invalid-ref/openapi.yaml'),
      config: await createConfig({}),
      removeUnusedComponents: true,
    });

    expect(problems).toHaveLength(1);
    expect(problems[0].ruleId).toEqual('bundler');
    expect(problems[0].message).toEqual("Can't resolve $ref");
  });

  it('should remove unused mediaTypes and keep used mediaTypes with schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.2.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  description: OK
                  content:
                    $ref: '#/components/mediaTypes/JsonPets'
        components:
          mediaTypes:
            JsonPets:
              'application/json':
                schema:
                  $ref: '#/components/schemas/Pet'
            UnusedMediaType:
              'application/json':
                schema:
                  type: string
          schemas:
            Pet:
              type: object
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3_2Types,
    });

    expect(results.bundle.parsed).toEqual({
      openapi: '3.2.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                description: 'OK',
                content: {
                  $ref: '#/components/mediaTypes/JsonPets',
                },
              },
            },
          },
        },
      },
      components: {
        mediaTypes: {
          JsonPets: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Pet',
              },
            },
          },
        },
        schemas: {
          Pet: {
            type: 'object',
          },
        },
      },
    });
  });

  it('should remove unused components using allOf but preserve those referencing a discriminator via allOf', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: array
                        items:
                          $ref: '#/components/schemas/Pet'
        components:
          schemas:
            Pet:
              type: object
              properties:
                petType:
                  type: string
              discriminator:
                propertyName: petType
                defaultMapping: '#/components/schemas/Cat'
              required:
                - petType
            Cat:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  name:
                    type: string
            Dog:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  bark:
                    type: string
            Lizard:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  lovesRocks:
                    type: boolean
            Unused:
              allOf:
                - type: object
                  properties:
                    one:
                      type: string
                - type: object
                  properties:
                    two:
                      type: string
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      types: Oas3_2Types,
      config: await createConfig({}),
      removeUnusedComponents: true,
    });

    expect(results.bundle.parsed).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "Cat": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Pet",
                },
                {
                  "properties": {
                    "name": {
                      "type": "string",
                    },
                  },
                  "type": "object",
                },
              ],
            },
            "Dog": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Pet",
                },
                {
                  "properties": {
                    "bark": {
                      "type": "string",
                    },
                  },
                  "type": "object",
                },
              ],
            },
            "Lizard": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Pet",
                },
                {
                  "properties": {
                    "lovesRocks": {
                      "type": "boolean",
                    },
                  },
                  "type": "object",
                },
              ],
            },
            "Pet": {
              "discriminator": {
                "defaultMapping": "#/components/schemas/Cat",
                "propertyName": "petType",
              },
              "properties": {
                "petType": {
                  "type": "string",
                },
              },
              "required": [
                "petType",
              ],
              "type": "object",
            },
          },
        },
        "openapi": "3.2.0",
        "paths": {
          "/pets": {
            "get": {
              "operationId": "listPets",
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "items": {
                          "$ref": "#/components/schemas/Pet",
                        },
                        "type": "array",
                      },
                    },
                  },
                },
              },
              "summary": "List all pets",
            },
          },
        },
      }
    `);
  });

  it('should keep securitySchemes referenced via SecurityRequirement or a $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /foo:
            get:
              security:
                - api_key: []
          /bar:
            get:
              security:
                - derived: []
        components:
          securitySchemes:
            api_key:
              type: apiKey
              name: api_key
              in: header
            base:
              type: apiKey
              name: base
              in: header
            derived:
              $ref: '#/components/securitySchemes/base'
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toMatchInlineSnapshot(`
      {
        "components": {
          "securitySchemes": {
            "api_key": {
              "in": "header",
              "name": "api_key",
              "type": "apiKey",
            },
            "base": {
              "in": "header",
              "name": "base",
              "type": "apiKey",
            },
            "derived": {
              "$ref": "#/components/securitySchemes/base",
            },
          },
        },
        "openapi": "3.2.0",
        "paths": {
          "/bar": {
            "get": {
              "security": [
                {
                  "derived": [],
                },
              ],
            },
          },
          "/foo": {
            "get": {
              "security": [
                {
                  "api_key": [],
                },
              ],
            },
          },
        },
      }
    `);
  });

  it('should remove unused securitySchemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          securitySchemes:
            unused:
              type: apiKey
              name: unused
              in: header
            derived:
              $ref: '#/components/securitySchemes/unused'
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      removeUnusedComponents: true,
      types: Oas3Types,
    });

    expect(results.bundle.parsed).toMatchInlineSnapshot(`
      {
        "openapi": "3.2.0",
      }
    `);
  });
});
