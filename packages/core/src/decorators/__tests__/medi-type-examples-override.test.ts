import { makeConfig, parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';
import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';

describe('oas3 media-type-examples-override', () => {
  expect.addSnapshotSerializer(yamlSerializer);
  it('should override response example', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    200:
                      description: json
                      content:
                        application/json:
                          example:
                            def:
                              value:
                                a: test
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                responses: {
                  '200': 'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
              },
            },
          },
        }
      ),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    example:
                      def:
                        value:
                          b: from external file
      components: {}

    `);
  });

  it('should override requestBody example', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  requestBody: 
                    content:
                      application/json:
                        example:
                          def:
                            value:
                              a: test123
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/response.yaml',
                },
              },
            },
          },
        }
      ),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            requestBody:
              content:
                application/json:
                  example:
                    def:
                      value:
                        name: test response name
      components: {}

    `);
  });

  it('should override requestBody example and 200 response', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '200':
                      description: json
                      content:
                        application/json:
                          examples:
                            def:
                              value:
                                message: test
                  requestBody: 
                    content:
                      application/json:
                        example:
                          def:
                            value:
                              a: test123
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
                responses: {
                  '200': 'packages/core/src/decorators/__tests__/resources/response.yaml',
                  '201': 'packages/core/src/decorators/__tests__/resources/response.yaml',
                },
              },
            },
          },
        }
      ),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          name: test response name
            requestBody:
              content:
                application/json:
                  example:
                    def:
                      value:
                        b: from external file
      components: {}

    `);
  });

  it('should not override the example', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '200':
                      description: json               
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                responses: {
                  '200': 'packages/core/src/decorators/__tests__/resources/response.yaml',
                },
              },
            },
          },
        }
      ),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
      components: {}

    `);
  });
});
