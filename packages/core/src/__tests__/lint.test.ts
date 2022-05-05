import { outdent } from 'outdent';

import { lintFromString, lintConfig, lintDocument } from '../lint';
import { BaseResolver } from '../resolve';
import { loadConfig } from '../config/load';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../__tests__/utils';

describe('lint', () => {
  it('lintFromString should work', async () => {
    const results = await lintFromString({
      absoluteRef: '/test/spec.yaml',
      source: outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: "1.0"
        description: Test
        license: Fail

      servers:
        - url: http://example.com
      paths: {}
    `,
      config: await loadConfig(),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "/test/spec.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('lintConfig should work', async () => {
    const document = parseYamlToDocument(
      outdent`
      apis: error string
      lint:
        plugins:
          - './local-plugin.js'
        extends:
          - recommended
          - local/all
        rules:
          operation-2xx-response: warn
          no-invalid-media-type-examples: error
          path-http-verbs-order: error
          boolean-parameter-prefixes: off
      features.openapi:
        showConsole: true
        layout:
          scope: section
        routingStrategy: browser
        theme:
          rightPanel:
            backgroundColor: '#263238'
          links:
            color: '#6CC496'
      `,
      '',
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/apis",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`ConfigApis\` (object) but got \`string\`",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/features.openapi/layout",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`string\` but got \`object\`.",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it("'plugins' shouldn't be allowed in 'apis' -> 'lint' field", async () => {
    const document = parseYamlToDocument(
      outdent`
      apis: 
        lint: 
          plugins: 
            - './local-plugin.js'
      lint:
        plugins:
          - './local-plugin.js'
      `,
      '',
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/apis/lint/plugins",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`plugins\` is not expected here.",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it("'const' can have any type", async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: "3.1.0"
      info:
        version: 1.0.0
        title: Swagger Petstore
        description: Information about Petstore
        license:
          name: MIT
          url: https://opensource.org/licenses/MIT
      servers:
        - url: http://petstore.swagger.io/v1
      paths:
        /pets:
          get:
            summary: List all pets
            operationId: listPets
            tags:
              - pets
            responses:
              200:
                description: An paged array of pets
                content:
                  application/json:
                    schema:
                      type: string
                      const: ABC
        `,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ spec: 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
