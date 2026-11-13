import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('spec-example-values', () => {
  it('should validate example field combinations according to OAS 3.2', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /test:
            get:
              responses:
                200:
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          name:
                            type: string
                      examples:
                        ValidDataValue:
                          dataValue:
                            name: John Doe
                        ValidSerializedValue:
                          serializedValue: '{"name":"John Doe"}'
                        ValidExternalValue:
                          externalValue: https://localhost/user-example.json
                        ValidValue:
                          value:
                            name: John Doe
                        InvalidDataValueAndValue:
                          dataValue:
                            name: John Doe
                          value:
                            name: Jane Doe
                        InvalidSerializedValueAndValue:
                          serializedValue: '{"name":"John Doe"}'
                          value:
                            name: Jane Doe
                        InvalidSerializedValueAndExternalValue:
                          serializedValue: '{"name":"John Doe"}'
                          externalValue: https://localhost/user-example.json
                        InvalidExternalValueAndValue:
                          externalValue: https://localhost/user-example.json
                          value:
                            name: Jane Doe
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-example-values': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/examples/InvalidDataValueAndValue/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`value\` and \`dataValue\` fields of an Example Object are mutually exclusive.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-example-values",
          "ruleId": "spec-example-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/examples/InvalidSerializedValueAndValue/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`value\` and \`serializedValue\` fields of an Example Object are mutually exclusive.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-example-values",
          "ruleId": "spec-example-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/examples/InvalidSerializedValueAndExternalValue/externalValue",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`externalValue\` and \`serializedValue\` fields of an Example Object are mutually exclusive.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-example-values",
          "ruleId": "spec-example-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/examples/InvalidExternalValueAndValue/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`value\` and \`externalValue\` fields of an Example Object are mutually exclusive.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-example-values",
          "ruleId": "spec-example-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report a falsy value next to externalValue when the deprecated rule name is used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          examples:
            some:
              value: 0
              externalValue: https://localhost/example.json
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-example-value-and-externalValue': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/examples/some/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`value\` and \`externalValue\` fields of an Example Object are mutually exclusive.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-example-values",
          "ruleId": "spec-example-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not check the OpenAPI 3.2 fields in an OpenAPI 3.1 description', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          examples:
            some:
              value: 12
              dataValue: 12
              serializedValue: '12'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-example-values': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});
