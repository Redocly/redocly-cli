import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 path-params-defined', () => {
  it('should not report on defined params', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets/{a}/{b}:
              parameters:
                - name: a
                  in: path
              get:
                parameters:
                 - name: b
                   in: path
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on undefined param params', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets/{a}/{b}:
              parameters:
                - name: a
                  in: path
                - name: b
                  in: header
              get:
                parameters:
                 - name: b
                   in: query
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets~1{a}~1{b}/get/parameters",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The operation does not define the path parameter \`{b}\` expected by path \`/pets/{a}/{b}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undeclared param', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets/{a}:
              parameters:
                - name: a
                  in: path
                - name: d
                  in: path
              get:
                parameters:
                 - name: c
                   in: path
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets~1{a}/parameters/1/name",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Path parameter \`d\` is not used in the path \`/pets/{a}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1pets~1{a}/get/parameters/0/name",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Path parameter \`c\` is not used in the path \`/pets/{a}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should fail cause POST has no parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets/{a}:
              get:
                parameters:
                 - name: a
                   in: path
              post:
                description: without parameters
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets~1{a}/post/parameters",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The operation does not define the path parameter \`{a}\` expected by path \`/pets/{a}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should apply parameters for POST operation from path parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets/{a}:
              parameters:
                - name: a
                  in: path
              get:
                parameters:
                 - name: a
                   in: path
              post:
                description: without parameters
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on undefined params in callback for next operation in same path item', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.1
        paths:
          /projects/{projectId}:
            post:
              operationId: createProject
              parameters:
                - name: projectId
                  in: path
                  required: true
                  schema:
                    type: string
              callbacks:
                onEvent:
                  '{$request.body#/callbackUrl}':
                    post:
                      summary: Callback endpoint
                      responses:
                        '200':
                          description: OK
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        callbackUrl:
                          type: string
              responses:
                '201':
                  description: Created

            patch:
              operationId: updateProject
              parameters:
                - name: projectId
                  in: path
                  required: true
                  schema:
                    type: string
              responses:
                '200':
                  description: OK
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should fail on undefined or missing params in callback', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.1
        paths:
          /projects/{projectId}:
            post:
              operationId: createProject
              parameters:
                - name: projectId
                  in: path
                  required: true
                  schema:
                    type: string
              callbacks:
                onEvent:
                  '{$request.body#/callbackUrl/{missingId}}':
                    post:
                      parameters:
                        - name: notDefinedId
                          in: path
                          required: true
                          schema:
                            type: string
                      responses:
                        '200':
                          description: OK
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        callbackUrl:
                          type: string
              responses:
                '201':
                  description: Created

            patch:
              operationId: updateProject
              parameters:
                - name: projectId
                  in: path
                  required: true
                  schema:
                    type: string
              responses:
                '200':
                  description: OK
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1projects~1{projectId}/post/callbacks/onEvent/{$request.body#~1callbackUrl~1{missingId}}/post/parameters/0/name",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Path parameter \`notDefinedId\` is not used in the path \`{$request.body#/callbackUrl/{missingId}}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1projects~1{projectId}/post/callbacks/onEvent/{$request.body#~1callbackUrl~1{missingId}}/post/parameters",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The operation does not define the path parameter \`{missingId}\` expected by path \`{$request.body#/callbackUrl/{missingId}}\`.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should fail on too deep callback nesting with 2 levels', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.1
        paths:
          /projects/{projectId}:
            post:
              operationId: createProject
              parameters:
                - name: projectId
                  in: path
                  required: true
                  schema:
                    type: string
              callbacks:
                onEvent:
                  '{$request.body#/callbackUrl}':
                    post:
                      summary: Callback endpoint
                      callbacks:
                        onEvent:
                          '{$request.body#/callbackUrl}':
                            post:
                              summary: Callback endpoint
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1projects~1{projectId}/post/callbacks/onEvent/{$request.body#~1callbackUrl}/post/callbacks/onEvent/{$request.body#~1callbackUrl}/post",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Maximum callback nesting depth (2) reached. Path parameter validation is limited beyond this depth to prevent infinite recursion.",
          "ruleId": "path-params-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on undefined params in case of reference', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test-endpoint:
            get:
              operationId: testEndpoint
              tags:
                - Test
              summary: Test endpoint to reproduce bug
              parameters:
                - $ref: ./test_params.yaml
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'path-params-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
