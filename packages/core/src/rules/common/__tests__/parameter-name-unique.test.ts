import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { lintDocumentForTest } from './utils/lint-document-for-test';

describe('Oas3 operation-name-unique', () => {
  it('should report if multiple parameters have same component name', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/test.yaml#/components/parameters/ParameterOne'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          parameters:
            ParameterOne:
              name: oneParameter
              in: query
              schema:
                type: integer
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'parameter-name-unique',
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
          "message": "Parameter 'ParameterOne' is not unique. It is defined at:
      - /foobar.yaml#/components/parameters/ParameterOne
      - /test.yaml#/components/parameters/ParameterOne",
          "ruleId": "parameter-name-unique",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on multiple parameters with same component name - filename', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/ParameterOne.yaml'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/ParameterOne.yaml',
        body: outdent`
          ParameterOne:
            name: oneParameter
            in: query
            schema:
              type: integer
        `,
      },
    ];

    const results = await lintDocumentForTest(
      'parameter-name-unique',
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
          "message": "Parameter 'ParameterOne' is not unique. It is defined at:
      - /foobar.yaml#/components/parameters/ParameterOne
      - /ParameterOne.yaml",
          "ruleId": "parameter-name-unique",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on multiple parameters with different component names', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/test.yaml#/components/parameters/OneParameter'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          parameters:
            OneParameter:
              name: oneParameter
              in: query
              schema:
                type: integer
      `,
      },
    ];

    const results = await lintDocumentForTest(
      'parameter-name-unique',
      document,
      additionalDocuments
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot('Array []');
  });
});
