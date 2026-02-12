import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('OAS3 spec-querystring-parameters (OAS 3.2)', () => {
  it('should report error when query and querystring are mixed within operation parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            get:
              parameters:
                - name: q
                  in: query
                  schema:
                    type: string
                - name: advancedQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/parameters/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: querystring\` cannot be used together with \`in: query\` in the same operation/path parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report error when query and querystring are not mixed within operation parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            get:
              parameters:
                - name: q
                  in: query
                  schema:
                    type: string
            post:
              parameters:
                - name: advancedQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report error when an operation-level parameter redefines a path-level parameter (querystring → query)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            parameters: 
              - name: foo
                in: querystring
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
            get:
              parameters:
                - name: foo
                  in: query
                  schema:
                    type: string
                - name: bar
                  in: query
                  schema:
                    type: string
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: query\` cannot be used together with \`in: querystring\` in the same operation/path parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/parameters/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: query\` cannot be used together with \`in: querystring\` in the same operation/path parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report error when only querystring is used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            get:
              parameters:
                - name: advancedQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report error when double querystring is used in the same operation parameter set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            get:
              parameters:
                - name: advancedQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
                - name: advancedQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/parameters",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: querystring\` should be defined only once per path/operation parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report error when one querystring is in path params and one in operation params', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            parameters:
              - name: pathQuery
                in: querystring
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
            get:
              parameters:
                - name: opQuery
                  in: querystring
                  content:
                    application/x-www-form-urlencoded:
                      schema:
                        type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/parameters",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: querystring\` should be defined only once per path/operation parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report error when double querystring is used in the same path parameter set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths:
          /test:
            parameters:
              - name: advancedQuery
                in: querystring
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
              - name: advancedQuery
                in: querystring
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          struct: 'error',
          'spec-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameters with \`in: querystring\` should be defined only once per path/operation parameter set (OpenAPI 3.2).",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
