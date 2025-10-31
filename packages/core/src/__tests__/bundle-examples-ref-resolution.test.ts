import outdent from 'outdent';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleDocument } from '../bundle/bundle-document.js';
import { parseYamlToDocument, yamlSerializer } from '../../__tests__/utils.js';
import { createConfig } from '../config/index.js';
import { BaseResolver } from '../resolve.js';
import { AsyncApi3Types, Oas3Types } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Bundle Examples $ref Resolution', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  describe('OpenAPI 3.0/3.1 Examples', () => {
    it('should resolve $ref in Example field', async () => {
      const testDocument = parseYamlToDocument(
        outdent`
            openapi: 3.0.0
            info:
              title: Test API
              version: 1.0.0
            paths:
              /test:
                get:
                  responses:
                    '200':
                      content:
                        application/json:
                          schema:
                            type: object
                            properties:
                              id:
                                type: integer
                              name:
                                type: string
                            example:
                              $ref: ${path.join(__dirname, 'fixtures/example-data.json')}
          `,
        ''
      );

      const { bundle: result, problems } = await bundleDocument({
        document: testDocument,
        externalRefResolver: new BaseResolver(),
        config: await createConfig({}),
        types: Oas3Types,
      });

      expect(problems).toHaveLength(0);
      expect(result.parsed).toMatchInlineSnapshot(`
          openapi: 3.0.0
          info:
            title: Test API
            version: 1.0.0
          paths:
            /test:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            id:
                              type: integer
                            name:
                              type: string
                          example:
                            id: 123
                            name: Test User
          components: {}
        `);
    });

    it('should NOT resolve $ref in Example.value field', async () => {
      const testDocument = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test API
            version: 1.0.0
          paths:
            /test:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        examples:
                          test-example:
                            value:
                              $ref: ./example-data.json
        `,
        ''
      );

      const { bundle: result, problems } = await bundleDocument({
        document: testDocument,
        externalRefResolver: new BaseResolver(),
        config: await createConfig({}),
        types: Oas3Types,
      });

      expect(problems).toHaveLength(0);
      expect(result.parsed).toMatchInlineSnapshot(`
        openapi: 3.1.0
        info:
          title: Test API
          version: 1.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      examples:
                        test-example:
                          value:
                            $ref: ./example-data.json
        components: {}
      `);
    });
  });

  describe('OpenAPI 3.2 Examples', () => {
    it('should NOT resolve $ref in Example.dataValue field', async () => {
      const testDocument = parseYamlToDocument(
        outdent`
          openapi: 3.2.0
          info:
            title: Test API
            version: 1.0.0
          paths:
            /test:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        examples:
                          test-example:
                            dataValue:
                              $ref: ./example-data.json
        `,
        ''
      );

      const { bundle: result, problems } = await bundleDocument({
        document: testDocument,
        externalRefResolver: new BaseResolver(),
        config: await createConfig({}),
        types: Oas3Types,
      });

      expect(problems).toHaveLength(0);
      expect(result.parsed).toMatchInlineSnapshot(`
        openapi: 3.2.0
        info:
          title: Test API
          version: 1.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      examples:
                        test-example:
                          dataValue:
                            $ref: ./example-data.json
        components: {}
      `);
    });
  });

  describe('AsyncAPI 3.0 Examples', () => {
    it('should NOT resolve $ref in Example.value field', async () => {
      const testDocument = parseYamlToDocument(
        outdent`
          asyncapi: 3.0.0
          info:
            title: Test AsyncAPI
            version: 1.0.0
          operations:
            sendUserSignedup:
              action: send
              messages:
                - payload:
                    type: object
                    examples:
                      test-example:
                        value:
                          $ref: ./example-data.json
        `,
        ''
      );

      const { bundle: result, problems } = await bundleDocument({
        document: testDocument,
        externalRefResolver: new BaseResolver(),
        config: await createConfig({}),
        types: AsyncApi3Types,
      });

      expect(problems).toHaveLength(0);
      expect(result.parsed).toMatchInlineSnapshot(`
        asyncapi: 3.0.0
        info:
          title: Test AsyncAPI
          version: 1.0.0
        operations:
          sendUserSignedup:
            action: send
            messages:
              - payload:
                  type: object
                  examples:
                    test-example:
                      value:
                        $ref: ./example-data.json
        components: {}
      `);
    });
  });

  describe('Edge cases and configuration', () => {
    it('should work with doNotResolveExamples: true config', async () => {
      const testDocument = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test API
            version: 1.0.0
          paths:
            /test:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        examples:
                          test-example:
                            value:
                              $ref: ./example-data.json
        `,
        ''
      );

      const config = await createConfig({
        resolve: {
          doNotResolveExamples: true,
        },
      });

      const { bundle: result, problems } = await bundleDocument({
        document: testDocument,
        externalRefResolver: new BaseResolver(),
        config,
        types: Oas3Types,
      });

      expect(problems).toHaveLength(0);
      expect(result.parsed).toMatchInlineSnapshot(`
        openapi: 3.1.0
        info:
          title: Test API
          version: 1.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      examples:
                        test-example:
                          value:
                            $ref: ./example-data.json
        components: {}
      `);
    });
  });
});
