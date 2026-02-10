import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { BaseResolver } from '../../../resolve.js';

describe('no-invalid-schema-examples', () => {
  it('should report on invalid falsy example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Car:
              type: object
              properties:
                color:
                  type: string
                  example: 0
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/components/schemas/Car/properties/color",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/components/schemas/Car/properties/color/example",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: type must be string.",
          "ruleId": "no-invalid-schema-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on nullable example for OAS3', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.3
        info: {}
        paths:
          /subscriptions:
            get:
              responses:
                "200":
                  content:
                    application/json:
                      schema:
                        nullable: true
                        type: object
                        example: null
                        allOf:
                          - $ref: "#/components/schemas/RiskMetadata"
        components:
          schemas:
            RiskMetadata:
              type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on invalid examples with additional properties', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            Car:
              type: object
              properties:
                color:
                  type: string
              examples:
                - color: "blue"
                  extraProperty: "not allowed"
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'no-invalid-schema-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/components/schemas/Car",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/components/schemas/Car/examples/0/extraProperty",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: must NOT have unevaluated properties \`extraProperty\`.",
          "ruleId": "no-invalid-schema-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not crash when examples in not an array', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /:
            get:
              responses:
                200:
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          foo:
                            type: string
                            examples: Wrong multiple example
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-invalid-schema-examples': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
