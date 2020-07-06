import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-invalid-media-type-examples', () => {
  it('should report on invalid example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: 13
                        b: "string"
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "from": Object {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": Array [
            Object {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example must be valid according to schema: \`a\` property type should be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "from": Object {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": Array [
            Object {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/b",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example must be valid according to schema: \`b\` property type should be number.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on invalid example with disallowAdditionalProperties', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: "string"
                        b: 13
                        c: unknown
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            disallowAdditionalProperties: true,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "from": Object {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": Array [
            Object {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/c",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example must be valid according to schema: should NOT have additional properties \`c\`.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not on invalid example with disallowAdditionalProperties', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: "string"
                        b: 13
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            disallowAdditionalProperties: true,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should not on invalid examples', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          examples:
            test:
              value:
                a: 23
                b: 25
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      examples:
                        test:
                          $ref: '#/components/examples/test'
                        test2:
                          value:
                            a: test
                            b: 35
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            disallowAdditionalProperties: true,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "from": Object {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": Array [
            Object {
              "pointer": "#/components/examples/test/value/a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example must be valid according to schema: \`a\` property type should be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report if no examples', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: test
                        b: 35

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report if no schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
