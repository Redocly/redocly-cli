import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('OAS3 spec-no-mixed-query-and-querystring-parameters (OAS 3.2)', () => {
  it('reports when query and querystring are mixed within operation parameters', async () => {
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
          'spec-no-mixed-query-and-querystring-parameters': 'error',
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
          "ruleId": "spec-no-mixed-query-and-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports when querystring is mixed with query across pathItem + operation parameters', async () => {
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
            get:
              parameters:
                - name: q
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
          'spec-no-mixed-query-and-querystring-parameters': 'error',
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
          "ruleId": "spec-no-mixed-query-and-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report when only querystring is used', async () => {
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
          'spec-no-mixed-query-and-querystring-parameters': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
