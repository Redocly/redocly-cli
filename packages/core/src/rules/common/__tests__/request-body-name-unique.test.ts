import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { lintDocumentForTest } from './utils/lint-document-for-test';

describe('Oas3 request-body-name-unique', () => {
  it('should report if multiple request bodies have same component name', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            post:
              requestBody:
                $ref: '#/components/requestBodies/MyRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/test.yaml#/components/requestBodies/MyRequestBody'
        components:
          requestBodies:
            MyRequestBody:
              required: true
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
        components:
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'request-body-name-unique',
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
          "message": "RequestBody 'MyRequestBody' is not unique. It is defined at:
      - /foobar.yaml#/components/requestBodies/MyRequestBody
      - /test.yaml#/components/requestBodies/MyRequestBody",
          "ruleId": "request-body-name-unique",
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
            post:
              requestBody:
                $ref: '#/components/requestBodies/MyRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/MyRequestBody.yaml'
        components:
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/MyRequestBody.yaml',
        body: outdent`
          components:
            requestBodies:
              MyRequestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: string
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'request-body-name-unique',
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
          "message": "RequestBody 'MyRequestBody' is not unique. It is defined at:
      - /foobar.yaml#/components/requestBodies/MyRequestBody
      - /MyRequestBody.yaml",
          "ruleId": "request-body-name-unique",
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
            post:
              requestBody:
                $ref: '#/components/requestBodies/TestRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/test.yaml#/components/requestBodies/Test2RequestBody'
        components:
          requestBodies:
            TestRequestBody:
              required: true
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
        components:
          requestBodies:
            Test2RequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
      },
    ];

    const results = await lintDocumentForTest(
      'request-body-name-unique',
      document,
      additionalDocuments
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot('Array []');
  });
});
