import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('Oas3 typed enum', () => {
  it('should not report on enum object if all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: A paged array of pets
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - 2
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on enum object if all items match type and enum is nullable', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: A paged array of pets
                    content:
                      application/json:
                        schema:
                          type: string
                          nullable: true
                          enum:
                            - A
                            - B
                            - C
                            - null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on enum object if not all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - string
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected "integer" but received "string".",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it("should report on enum object, 'string' value in enum does not have allowed types", async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type:
                            - integer
                            - array
                          enum:
                            - 1
                            - string
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Enum value \`string\` must be of allowed types: \`integer,array\`.",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not crash on null schema when there is struct rule', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: test
            version: 1.2.3
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: test
                    content:
                      application/json:
                        schema: null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error', 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`Schema\` (object) but got \`null\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should work for AsyncAPI 3', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Test
          version: 1.0.0
        channels:
          userSignedup:
            messages:
              Test:
                $ref: '#/components/messages/Test'
        components:
          messages:
            Test:
              payload:
                type: number
                enum:
                  - 1 # correct
                  - incorrect
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/messages/Test/payload/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected "number" but received "string".",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should work for AsyncAPI 2.6', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Test API
          version: '1.0.0'
        components:
          schemas:
            Test:
              type: string
              enum:
                - correct
                - 42 # incorrect
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Test/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected "string" but received "integer".",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should work for Arazzo 1.0.1', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.0.1
        info:
          title: Test inputs
          version: 1.0.0
        workflows:
          - workflowId: test
            inputs:
              type: object
              properties:
                foo:
                  type: string
                  enum:
                    - correct
                    - 42 # incorrect
            steps:
              - stepId: test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/inputs/properties/foo/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected "string" but received "integer".",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
