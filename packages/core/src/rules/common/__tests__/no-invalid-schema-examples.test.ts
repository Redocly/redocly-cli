import path from 'node:path';
import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
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
          "reference": "https://redocly.com/docs/cli/rules/oas/no-invalid-schema-examples",
          "ruleId": "no-invalid-schema-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on readOnly/writeOnly properties in schema example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Car:
              type: object
              properties:
                readOnlyProp:
                  type: string
                  readOnly: true
                writeOnlyProp:
                  type: string
                  writeOnly: true
              examples:
                valid:
                  value:
                    readOnlyProp: "propValue"
                    writeOnlyProp: "propValue"
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
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

    expect(replaceSourceWithRef(results)).toEqual([]);
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
          "reference": "https://redocly.com/docs/cli/rules/oas/no-invalid-schema-examples",
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

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should validate examples inside OAS 3.1 schemas that declare $id and $defs', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Alpha:
              $id: 'https://example.com/schemas/alpha'
              type: object
              properties:
                items:
                  type: array
                  items:
                    $ref: '#/$defs/Item'
                  example:
                    - 'valid-string'
                badItems:
                  type: array
                  items:
                    $ref: '#/$defs/Item'
                  example:
                    - 123
                tag:
                  $ref: 'tag'
              $defs:
                Item:
                  type: string
              example:
                items:
                  - 'ok'
                tag:
                  label: 'featured'
            Beta:
              $id: 'https://example.com/schemas/beta'
              type: object
              properties:
                items:
                  type: array
                  items:
                    $ref: '#/$defs/Item'
                  example:
                    - 42
              $defs:
                Item:
                  type: integer
            Tag:
              $id: 'https://example.com/schemas/tag'
              type: object
              properties:
                label:
                  type: string
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

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/components/schemas/Alpha/properties/badItems",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/components/schemas/Alpha/properties/badItems/example/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`0\` property type must be string.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-invalid-schema-examples",
          "ruleId": "no-invalid-schema-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
  it('should validate examples on nested relative $id schemas and on schemas sharing an $id', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'https://example.com/schemas/pet.json'
              type: object
              properties:
                collar:
                  $id: 'parts/collar.json'
                  type: object
                  properties:
                    tag:
                      $ref: '../tag.json'
                  example:
                    tag:
                      code: 123
                rate 100%:
                  type: object
                  properties:
                    value:
                      $ref: '#/$defs/Value'
                  example:
                    value: 'not a number'
              $defs:
                Value:
                  type: number
            Tag:
              $id: 'https://example.com/schemas/tag.json'
              type: object
              properties:
                code:
                  type: string
            A:
              $id: 'https://example.com/schemas/dup'
              type: object
              properties:
                x:
                  $ref: '#/$defs/X'
                items:
                  type: array
                  items:
                    $ref: '#/$defs/X'
                  example:
                    - 'a string'
              $defs:
                X:
                  type: string
              example:
                x: 'a'
            B:
              $id: 'https://example.com/schemas/dup'
              type: object
              properties:
                x:
                  $ref: '#/$defs/X'
                items:
                  type: array
                  items:
                    $ref: '#/$defs/X'
                  example:
                    - 'not a number'
                missing:
                  $ref: 'missing'
              $defs:
                X:
                  type: integer
              example:
                x: 1
                missing: 1
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    // the internal marker that keeps duplicate $id resources apart never shows up in messages
    expect(results.map(({ message, location }) => `${location[0].pointer}: ${message}`))
      .toMatchInlineSnapshot(`
      [
        "#/components/schemas/Pet/properties/collar/example/tag/code: Example value must conform to the schema: \`code\` property type must be string.",
        "#/components/schemas/Pet/properties/rate 100%/example/value: Example value must conform to the schema: \`value\` property type must be number.",
        "#/components/schemas/B/properties/items/example/0: Example value must conform to the schema: \`0\` property type must be integer.",
        "#/components/schemas/B/schema: Example validation errored: can't resolve reference missing from id https://example.com/schemas/dup.",
      ]
    `);
  });

  it('should validate examples of $id schemas regardless of how their $id or refs are written', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Parent:
              $id: 'https://example.com/schemas/parent'
              type: object
              properties:
                legacy:
                  $id: '#legacy'
                  type: string
                  example: 'ok'
              example:
                legacy: 'ok'
            Upper:
              $id: 'HTTPS://EXAMPLE.COM/schemas/upper'
              type: object
              properties:
                tag:
                  $ref: 'https://example.com/schemas/tag'
              example:
                tag:
                  color: 1
            Tag:
              $id: 'https://example.com/schemas/tag'
              type: object
              properties:
                color:
                  type: string
            Animal:
              $id: 'https://example.com/schemas/animal'
              $defs:
                Cat:
                  type: object
                  properties:
                    whiskers:
                      $ref: '#/$defs/Whiskers'
                Whiskers:
                  type: integer
            Wrapper:
              type: object
              properties:
                cat:
                  $ref: '#/components/schemas/Animal/$defs/Cat'
              example:
                cat:
                  whiskers: 'many'
            Rates:
              $id: 'rates/latest'
              type: object
              properties:
                rate:
                  $ref: '#/$defs/Rate'
              $defs:
                Rate:
                  type: number
              example:
                rate: 'high'
      `,
      path.join('/tmp/100%dir', 'openapi.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(results.map(({ message, location }) => `${location[0].pointer}: ${message}`))
      .toMatchInlineSnapshot(`
      [
        "#/components/schemas/Upper/example/tag/color: Example value must conform to the schema: \`color\` property type must be string.",
        "#/components/schemas/Wrapper/example/cat/whiskers: Example value must conform to the schema: \`whiskers\` property type must be integer.",
        "#/components/schemas/Rates/example/rate: Example value must conform to the schema: \`rate\` property type must be number.",
      ]
    `);
  });

  it('should report a broken ref in a schema without $id as before', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            Outer:
              id: 'http://example.com/s#%80'
              type: object
              properties:
                x:
                  $ref: '#/components/schemas/Missing'
              example:
                x: 1
      `,
      path.join('/tmp/redocly-id-test', 'openapi.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(results.map(({ message }) => message)).toMatchInlineSnapshot(`
      [
        "Example validation errored: can't resolve reference #/components/schemas/Missing from id http://example.com/s#%80.",
      ]
    `);
  });
});
