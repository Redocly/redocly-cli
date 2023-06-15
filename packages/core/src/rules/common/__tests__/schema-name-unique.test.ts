import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { lintDocumentForTest } from './utils/lint-document-for-test';

describe('Oas3 schema-name-unique', () => {
  it('should report on multiple schemas with same name', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            SomeSchema:
              type: object
            Test:
              type: object
              properties:
                there:
                  $ref: '/test.yaml#/components/schemas/SomeSchema'
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          schemas:
            SomeSchema:
              type: object
      `,
      },
    ];

    const results = await lintDocumentForTest('schema-name-unique', document, additionalDocuments);

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
          "message": "Schema 'SomeSchema' is not unique. It is defined at:
      - /foobar.yaml#/components/schemas/SomeSchema
      - /test.yaml#/components/schemas/SomeSchema",
          "ruleId": "schema-name-unique",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on multiple schemas with same name - filename', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      components:
        schemas:
          SomeSchema:
            type: object
          Test:
            type: object
            properties:
              there:
                $ref: '/SomeSchema.yaml'
    `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/SomeSchema.yaml',
        body: outdent`
        type: object
        properties:
          test:
            type: number
    `,
      },
    ];

    const results = await lintDocumentForTest('schema-name-unique', document, additionalDocuments);

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
        "message": "Schema 'SomeSchema' is not unique. It is defined at:
    - /foobar.yaml#/components/schemas/SomeSchema
    - /SomeSchema.yaml",
        "ruleId": "schema-name-unique",
        "severity": "error",
        "suggest": Array [],
      },
    ]
  `);
  });

  it('should not report on multiple schemas with different names', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            SomeSchema:
              type: object
            Test:
              type: object
              properties:
                there:
                  $ref: '/test.yaml#/components/schemas/OtherSchema'
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        openapi: 3.0.0
        components:
          schemas:
            OtherSchema:
              type: object
      `,
      },
    ];

    const results = await lintDocumentForTest('schema-name-unique', document, additionalDocuments);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot('Array []');
  });
});
