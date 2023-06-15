import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver, Document } from '../../../resolve';

// TODO add test with .yaml, .yml without openapi headers

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

    const results = await lintDocumentForTest(document, additionalDocuments);

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

    const results = await lintDocumentForTest(document, additionalDocuments);

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

    const results = await lintDocumentForTest(document, additionalDocuments);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot('Array []');
  });
});

async function lintDocumentForTest(
  document: Document,
  additionalDocuments: { absoluteRef: string; body: string }[]
) {
  const baseResolver = new BaseResolver();
  additionalDocuments.forEach((item) =>
    baseResolver.cache.set(
      item.absoluteRef,
      Promise.resolve(parseYamlToDocument(item.body, item.absoluteRef))
    )
  );
  return await lintDocument({
    externalRefResolver: baseResolver,
    document,
    config: await makeConfig({ 'schema-name-unique': 'error' }),
  });
}
