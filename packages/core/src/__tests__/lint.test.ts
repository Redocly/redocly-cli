import * as path from 'path';
import { outdent } from 'outdent';

import { lintFromString, lintConfig, lintDocument, lint } from '../lint';
import { BaseResolver } from '../resolve';
import { loadConfig } from '../config/load';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../__tests__/utils';
import { detectSpec } from '../oas-types';

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
          - url: http://redocly-example.com
        paths: {}
    `,
      config: await loadConfig(),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "/test/spec.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "spec",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lint should work', async () => {
    const results = await lint({
      ref: path.join(__dirname, 'fixtures/lint/openapi.yaml'),
      config: await loadConfig({
        configPath: path.join(__dirname, 'fixtures/redocly.yaml'),
      }),
    });

    expect(replaceSourceWithRef(results, path.join(__dirname, 'fixtures/lint/')))
      .toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "openapi.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "spec",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should work', async () => {
    const document = parseYamlToDocument(
      outdent`
        apis: error string
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
          rule/operation-summary-length:
            subject:
              type: Operation
              property: summary
            message: Operation summary should start with an active verb
            assertions:
              local/checkWordsCount:
                min: 3
      theme:
        openapi:
          showConsole: true
          layout:
            scope: section
          routingStrategy: browser
          theme:
            rightPanel:
              backgroundColor: '#263238'
            links:
              color: '#6CC496'
            theme:
              openapi:
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
      ''
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/eme",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`eme\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [
            "theme",
            "env",
            "seo",
            "sso",
          ],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/openapi",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`openapi\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis",
              "reportOnKey": false,
              "source": "",
            },
          ],
          "message": "Expected type \`ConfigApis\` (object) but got \`string\`",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lintConfig should detect wrong fields and suggest correct ones', async () => {
    const document = parseYamlToDocument(
      outdent`
        api:
          name@version:
            root: ./file.yaml
        rules:
          operation-2xx-response: warn
      `,
      ''
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/api",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`api\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [
            "apis",
            "seo",
            "sso",
            "env",
          ],
        },
      ]
    `);
  });

  it('lintConfig should work with legacy fields - referenceDocs', async () => {
    const document = parseYamlToDocument(
      outdent`
        apis:
          entry:
            root: ./file.yaml
        rules:
          operation-2xx-response: warn
        referenceDocs:
          showConsole: true
      `,
      ''
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/referenceDocs",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`referenceDocs\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it("'plugins' shouldn't be allowed in 'apis'", async () => {
    const document = parseYamlToDocument(
      outdent`
        apis:
          main:
            root: ./main.yaml
            plugins:
            - './local-plugin.js'
        plugins:
        - './local-plugin.js'
      `,
      ''
    );
    const results = await lintConfig({ document });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/apis/main/plugins",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Property \`plugins\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "error",
          "suggest": [],
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
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ spec: 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('detect OpenAPI should throw an error when version is not string', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(
      `Invalid OpenAPI version: should be a string but got "number"`
    );
  });

  it('detect unsupported OpenAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported OpenAPI version: 1.0.4`);
  });

  it('detect unsupported AsyncAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported AsyncAPI version: 1.0.4`);
  });

  it('detect unsupported spec format', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        notapi: 3.1.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported specification`);
  });

  it("spec rule shouldn't throw an error for named callback", async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Callback test
          version: 'alpha'
        components:
          callbacks:
            resultCallback:
              '{$url}':
                post:
                  requestBody:
                    description: Callback payload
                    content:
                      'application/json':
                        schema:
                          type: object
                          properties:
                            test:
                              type: string
                  responses:
                    '200':
                      description: callback successfully processed
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ spec: 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should ignore error because ignore file passed', async () => {
    const absoluteRef = path.join(__dirname, 'fixtures/openapi.yaml');
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          version: 1.0.0
          title: Example OpenAPI 3 definition.
          description: Information about API
          license:
            name: MIT
            url: 'https://opensource.org/licenses/MIT'
        servers:
          - url: 'https://redocly.com/v1'
        paths:
          '/pets/{petId}':
            post:
              responses:
                '201':
                  summary: Exist
                  description: example description
      `,
      absoluteRef
    );

    const configFilePath = path.join(__dirname, 'fixtures');

    const result = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-operationId': 'error' }, undefined, configFilePath),
    });
    expect(result).toHaveLength(1);
    expect(result).toMatchObject([
      {
        ignored: true,
        location: [{ pointer: '#/paths/~1pets~1{petId}/post/operationId' }],
        message: 'Operation object should contain `operationId` field.',
        ruleId: 'operation-operationId',
        severity: 'error',
      },
    ]);
    expect(result[0]).toHaveProperty('ignored', true);
    expect(result[0]).toHaveProperty('ruleId', 'operation-operationId');
  });
});
