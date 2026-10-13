import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 operation-4xx-response', () => {
  it('should report missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              put:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report for present 400 response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  400:
                    description: error response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should not report for present 4XX response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  4XX:
                    description: error response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should report if default is present but missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  default:
                    description: some default response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report even if the responses are null', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses: null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-2xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`2XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-2xx-response",
          "ruleId": "operation-2xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report missing 4xx response in webhooks when enabled', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          webhooks:
            '/test/':
              put:
                responses:
                  200:
                    description: success response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', validateWebhooks: true },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/webhooks/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report missing 4xx response in webhooks when not enabled', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          x-webhooks:
            '/test/':
              put:
                responses:
                  200:
                    description: success response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should report missing 4xx response for any method by default', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report operations with excluded methods', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get:
                responses:
                  200:
                    description: ok response
              post:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', excludeMethods: ['GET'] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/post/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should skip null operations with excluded methods', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get: null
              post:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', excludeMethods: ['get'] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/post/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report $ref-ed operations with excluded methods', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          paths:
            '/test':
              get:
                $ref: '#/x-operations/GetTest'
              head:
                $ref: '#/x-operations/HeadTest'
                responses:
                  200:
                    description: ok response
              post:
                $ref: '#/x-operations/PostTest'
          x-operations:
            GetTest:
              responses:
                200:
                  description: ok response
            HeadTest:
              summary: Head test
            PostTest:
              responses:
                200:
                  description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', excludeMethods: ['get', 'head'] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/x-operations/PostTest/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should check callback operations by their own method', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/a':
              get:
                responses:
                  200:
                    description: ok response
                callbacks:
                  onEvent:
                    '{$request.body#/url}':
                      post:
                        responses:
                          200:
                            description: ok response
            '/b':
              post:
                responses:
                  200:
                    description: ok response
                callbacks:
                  onEvent:
                    '{$request.body#/url}':
                      get:
                        responses:
                          200:
                            description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', excludeMethods: ['get'] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1a/get/callbacks/onEvent/{$request.body#~1url}/post/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1b/post/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report webhook operations with excluded methods', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          webhooks:
            '/test/':
              get:
                responses:
                  200:
                    description: success response
              post:
                responses:
                  200:
                    description: success response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'operation-4xx-response': {
            severity: 'error',
            validateWebhooks: true,
            excludeMethods: ['get'],
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/webhooks/~1test~1/post/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-response",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
