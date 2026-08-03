import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 operation-4xx-problem-details-rfc7807', () => {
  it('should report `4xx` must have content type `application/problem+json` ', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          type:
                            type: string
                          title:
                            type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Response \`4xx\` must have content-type \`application/problem+json\`.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report `application/problem+json` must have `type` property', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      schema:
                        type: object
                        properties:
                          title:
                            type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema/properties/type",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`type\` field.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when `type` and `title` are defined via allOf', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      schema:
                        allOf:
                          - $ref: '#/components/schemas/ProblemDetails'
                          - type: object
                            properties:
                              validationErrors:
                                type: array
                                items:
                                  type: string
        components:
          schemas:
            ProblemDetails:
              type: object
              properties:
                type:
                  type: string
                title:
                  type: string
                status:
                  type: integer
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when `type` and `title` are missing from all allOf branches', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      schema:
                        allOf:
                          - $ref: '#/components/schemas/BaseError'
                          - type: object
                            properties:
                              detail:
                                type: string
        components:
          schemas:
            BaseError:
              type: object
              properties:
                status:
                  type: integer
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`type\` field.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`title\` field.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when `type` and `title` are defined in every oneOf variant', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      schema:
                        oneOf:
                          - $ref: '#/components/schemas/NotFoundProblem'
                          - $ref: '#/components/schemas/ValidationProblem'
        components:
          schemas:
            NotFoundProblem:
              type: object
              properties:
                type:
                  type: string
                title:
                  type: string
            ValidationProblem:
              type: object
              properties:
                type:
                  type: string
                title:
                  type: string
                errors:
                  type: array
                  items:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report `application/problem+json` must have `schema` property', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      example: asd
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "MediaType object should contain \`schema\` field.",
          "reference": "https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
