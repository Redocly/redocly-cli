import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-illogical-composition-keywords', () => {
  describe('oneOf', () => {
    it('should report when oneOf has only one schema', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "\`oneOf\` should have at least two schemas. Use the schema directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when oneOf has only one schema but the parent declares a discriminator', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                discriminator:
                  propertyName: petType
                oneOf:
                  - $ref: '#/components/schemas/Cat'
              Cat:
                type: object
                properties:
                  petType:
                    type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report duplicated schemas that are not next to each other', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - type: integer
                  - $ref: '#/components/schemas/Cat'
              Cat:
                type: object
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/2",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` duplicates the schema at position 1.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report distinct refs that resolve to equal schemas as overlapping', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Kitten'
              Cat:
                type: object
                properties:
                  id:
                    type: string
              Kitten:
                type: object
                properties:
                  id:
                    type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: \`#/components/schemas/Cat\` and \`#/components/schemas/Kitten\`. Both schemas define \`id\` without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report a discriminator gap when `propertyName` is not a string', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Cat:
                type: object
                properties:
                  name:
                    type: string
                required: [name]
              Dog:
                type: object
                properties:
                  name:
                    type: string
                  bark:
                    type: string
                required: [name]
              Test:
                discriminator:
                  propertyName:
                    name:
                      type: string
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Dog'
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should not report a discriminator gap when `defaultMapping` is declared', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.2.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Cat:
                type: object
                properties:
                  petType:
                    type: string
                  name:
                    type: string
              Dog:
                type: object
                properties:
                  petType:
                    type: string
                  bark:
                    type: string
              Pet:
                discriminator:
                  propertyName: petType
                  defaultMapping: Cat
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Dog'
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report inline members that a discriminator cannot select', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Cat:
                type: object
                properties:
                  petType:
                    type: string
                required: [petType]
              Test:
                discriminator:
                  propertyName: petType
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - type: object
                    properties:
                      petType:
                        type: string
                    required: [petType]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` is inline, so the \`discriminator\` cannot select it. Use a \`$ref\` to a named schema.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should compare `const` against `enum` as a single allowed value', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Exclusive:
                oneOf:
                  - type: string
                    enum: [card]
                  - type: string
                    const: bank
              Overlapping:
                oneOf:
                  - enum: [card]
                  - const: card
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Overlapping/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Both schemas allow the values ["card"].",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report an empty schema inside oneOf', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: string
                  - {}
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` is empty, so it matches any value.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when a referenced schema and a null schema both accept null', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - $ref: '#/components/schemas/ContainsNull'
                  - type: 'null'
              ContainsNull:
                type:
                  - object
                  - 'null'
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: \`#/components/schemas/ContainsNull\` and schema at position 2. Both schemas accept \`null\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when type sets overlap', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: string
                  - type:
                      - string
                      - integer
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Both schemas accept \`string\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report `integer` against `number` as overlapping', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Overlapping:
                oneOf:
                  - type: integer
                  - type: number
              Exclusive:
                oneOf:
                  - type: integer
                  - type: string
              FractionalOnly:
                oneOf:
                  - type: integer
                  - type: number
                    enum: [1.5, 2.5]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Overlapping/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Both schemas accept \`integer\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when a shared property uses an unmodelled keyword such as `not`', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - $ref: '#/components/schemas/Lizard'
                  - $ref: '#/components/schemas/OtherPet'
              Lizard:
                type: object
                required: [petType]
                properties:
                  petType:
                    type: string
                    enum: ['Lizard']
              OtherPet:
                type: object
                required: [petType]
                properties:
                  petType:
                    not:
                      enum: ['Lizard']
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should not crash on boolean schemas used as members or property schemas', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Members:
                oneOf:
                  - true
                  - type: string
              Properties:
                oneOf:
                  - type: object
                    required: [kind]
                    properties:
                      kind: true
                  - type: object
                    required: [kind]
                    properties:
                      kind:
                        type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report when both members declare an empty required list', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    required: []
                    properties:
                      name:
                        type: string
                  - type: object
                    title: Second
                    required: []
                    properties:
                      name:
                        type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and \`Second\`. Both schemas define \`name\` without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when one member forbids a property the other requires', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    additionalProperties: false
                    required: [a]
                    properties:
                      a:
                        type: string
                  - type: object
                    required: [a, b]
                    properties:
                      a:
                        type: string
                      b:
                        type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report when an exclusive shared property is not required, without a discriminator', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    properties:
                      kind:
                        type: string
                        enum: [cat]
                  - type: object
                    properties:
                      kind:
                        type: string
                        enum: [dog]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Add \`kind\` to \`required\` in every schema; an optional property cannot distinguish the schemas.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report each overlapping pair of a oneOf separately', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: string
                  - type: string
                    title: Second
                  - type: string
                    title: Third
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and \`Second\`. Both schemas accept \`string\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and \`Third\`. Both schemas accept \`string\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: \`Second\` and \`Third\`. Both schemas accept \`string\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report the discriminator property as required when members do not declare it', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Pet:
                discriminator:
                  propertyName: petType
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Dog'
              Cat:
                type: object
                properties:
                  petType:
                    type: string
              Dog:
                type: object
                properties:
                  petType:
                    type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Pet/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: \`#/components/schemas/Cat\` and \`#/components/schemas/Dog\`. Add \`petType\` to \`required\` in every schema; the \`discriminator\` cannot read a property a value may omit.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when the discriminator property is required in every member', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Pet:
                discriminator:
                  propertyName: petType
                oneOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Dog'
              Cat:
                type: object
                required: [petType, name]
                properties:
                  name:
                    type: string
              Dog:
                type: object
                required: [petType, name]
                properties:
                  name:
                    type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report members that differ only by `format`', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    required: [id]
                    properties:
                      id:
                        type: string
                        format: uuid
                  - type: object
                    required: [id]
                    properties:
                      id:
                        type: string
                        format: uri
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Both schemas define \`id\` without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when the schema and a `oneOf` member both accept null', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              NullableParent:
                nullable: true
                oneOf:
                  - type: string
                    nullable: true
                  - type: integer
              PlainParent:
                oneOf:
                  - type: string
                    nullable: true
                  - type: integer
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/NullableParent/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "The schema and a schema in \`oneOf\` both accept \`null\`, so nothing decides which one applies to a null value.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when a required property with exclusive values tells the members apart', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    additionalProperties:
                      type: string
                    properties:
                      kind:
                        type: string
                        enum: [cat]
                    required: [kind]
                  - type: object
                    additionalProperties:
                      type: string
                    properties:
                      kind:
                        type: string
                        enum: [dog]
                    required: [kind]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report when members share a property with no constraint that tells them apart', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    additionalProperties: false
                    properties:
                      name:
                        type: string
                    required: [name]
                  - type: object
                    properties:
                      name:
                        type: string
                    required: [name]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Both schemas define \`name\` without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when the discriminator property is not required in every member', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                discriminator:
                  propertyName: petType
                oneOf:
                  - type: object
                    properties:
                      petType:
                        type: string
                        enum: [cat]
                  - type: object
                    properties:
                      petType:
                        type: string
                        enum: [dog]
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/0",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` is inline, so the \`discriminator\` cannot select it. Use a \`$ref\` to a named schema.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` is inline, so the \`discriminator\` cannot select it. Use a \`$ref\` to a named schema.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and schema at position 2. Add \`petType\` to \`required\` in every schema; the \`discriminator\` cannot read a property a value may omit.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when members have different types', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: string
                  - type: integer
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('anyOf', () => {
    it('should report when anyOf has only one schema', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                anyOf:
                  - type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/anyOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "\`anyOf\` should have at least two schemas. Use the schema directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report duplicated and empty schemas inside anyOf', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                anyOf:
                  - type: string
                  - type: string
                  - {}
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/anyOf/2",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`anyOf\` is empty, so it matches any value.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/anyOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`anyOf\` duplicates the schema at position 1.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report anyOf used with a discriminator by default', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                discriminator:
                  propertyName: petType
                anyOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Dog'
              Cat:
                type: object
              Dog:
                type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('allOf', () => {
    it('should report an allOf wrapper that adds nothing', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                allOf:
                  - $ref: '#/components/schemas/Cat'
              Cat:
                type: object
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/allOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "\`allOf\` should have at least two schemas. Use the schema directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report a single-schema allOf used to attach sibling keywords', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                type: object
                properties:
                  customerId:
                    readOnly: true
                    allOf:
                      - $ref: '#/components/schemas/CustomerId'
              CustomerId:
                type: string
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should not report a single-schema allOf declaring a subtype of a discriminated schema', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.3
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Pet:
                type: object
                required: [petType]
                properties:
                  petType:
                    type: string
                discriminator:
                  propertyName: petType
              Cat:
                allOf:
                  - $ref: '#/components/schemas/Pet'
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });

    it('should report an empty allOf', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                allOf: []
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/allOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "\`allOf\` should have at least two schemas.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report duplicated and empty schemas inside allOf', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                allOf:
                  - $ref: '#/components/schemas/Cat'
                  - $ref: '#/components/schemas/Cat'
                  - {}
              Cat:
                type: object
        `,
        'foobar.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'no-illogical-composition-keywords': 'error' },
        }),
      });

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/allOf/2",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`allOf\` is empty, so it matches any value.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/allOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`allOf\` duplicates the schema at position 1.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });
  });

  it('should check every composition keyword used on the same schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths: {}
        components:
          schemas:
            Test:
              oneOf:
                - type: string
              allOf:
                - $ref: '#/components/schemas/Cat'
                - $ref: '#/components/schemas/Cat'
            Cat:
              type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-illogical-composition-keywords': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Test/allOf/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Schema in \`allOf\` duplicates the schema at position 1.",
          "ruleId": "no-illogical-composition-keywords",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Test/oneOf",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`oneOf\` should have at least two schemas. Use the schema directly instead.",
          "ruleId": "no-illogical-composition-keywords",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
