import { outdent } from 'outdent';
import { cloneDeep } from 'lodash';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { bundleDocument } from '../../../bundle';
import { BaseResolver } from '../../../resolve';

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
      config: await makeConfig({}),
      removeUnusedComponents: true,
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
      config: await makeConfig({}),
      removeUnusedComponents: true,
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

  it('should remove unused components even if they have a root allOf', async () => {
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
          schemas:
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
            Used:
              type: object
              properties:
                link:
                  type: string
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({}),
      removeUnusedComponents: true,
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
          Used: {
            type: 'object',
            properties: {
              link: { type: 'string' },
            },
          },
        },
      },
    });
  });

  it('should remove unused components even if they have a root allOf and a discriminator', async () => {
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
        `,
      'foobar.yaml'
    );

    const orig = cloneDeep(document.parsed);

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({}),
      removeUnusedComponents: true,
    });

    // unchanged document
    expect(results.bundle.parsed).toEqual(orig);
  });
});
