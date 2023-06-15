import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { lintDocumentForTest } from './utils/lint-document-for-test';

describe('Oas3 response-name-unique', () => {
  it('should report if multiple responses have same component name', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/SuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/test.yaml#/components/responses/SuccessResponse'
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'response-name-unique',
      document,
      additionalDocuments
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/",
              "reportOnKey": false,
              "source": "/foobar.yaml",
            },
          ],
          "message": "Response 'SuccessResponse' is not unique. It is defined at:
      - /foobar.yaml#/components/responses/SuccessResponse
      - /test.yaml#/components/responses/SuccessResponse",
          "ruleId": "response-name-unique",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on multiple responses with same component name - filename', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/SuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/SuccessResponse.yaml'
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/SuccessResponse.yaml',
        body: outdent`
          description: Successful response
          content:
            application/json:
              schema:
                type: string
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'response-name-unique',
      document,
      additionalDocuments
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/",
              "reportOnKey": false,
              "source": "/foobar.yaml",
            },
          ],
          "message": "Response 'SuccessResponse' is not unique. It is defined at:
      - /foobar.yaml#/components/responses/SuccessResponse
      - /SuccessResponse.yaml",
          "ruleId": "response-name-unique",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on multiple responses with different component names', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/TestSuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/test.yaml#/components/responses/Test2SuccessResponse'
        components:
          responses:
            TestSuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          responses:
            Test2SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
      },
    ];

    const results = await lintDocumentForTest(
      'response-name-unique',
      document,
      additionalDocuments
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot('Array []');
  });
});
