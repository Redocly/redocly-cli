import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-illogical-composition-keywords', () => {
  async function lint(yaml: string) {
    const document = parseYamlToDocument(outdent`${yaml}`, 'foobar.yaml');
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-illogical-composition-keywords': 'error' },
      }),
    });
    return replaceSourceWithRef(results);
  }

  describe('oneOf', () => {
    it('should report when oneOf has only one schema', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report duplicated schemas that are not next to each other', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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

    it('should stay quiet when the discriminator `propertyName` is not a string', async () => {
      expect(
        await lint(`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                discriminator:
                  propertyName:
                    name:
                      type: string
                oneOf:
                  - type: object
                    properties:
                      name:
                        type: string
                    required: [name]
                  - type: object
                    properties:
                      name:
                        type: string
                      description:
                        type: string
                    required: [name]
        `)
      ).toMatchInlineSnapshot(`
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
        ]
      `);
    });

    it('should report inline members that a discriminator cannot select', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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

    it('should report an empty schema inside oneOf', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - $ref: '#/components/schemas/InvoiceTimeShift'
                  - type: 'null'
              InvoiceTimeShift:
                type:
                  - object
                  - 'null'
        `)
      ).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: \`#/components/schemas/InvoiceTimeShift\` and schema at position 2. Both schemas accept \`null\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when type sets overlap', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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

    it('should not report when a shared property uses not to exclude the other value', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not crash on boolean schemas used as members or property schemas', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when members carry constraints these checks do not model', async () => {
      expect(
        await lint(`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Patterns:
                oneOf:
                  - type: string
                    pattern: '^a'
                  - type: string
                    pattern: '^b'
              Ranges:
                oneOf:
                  - type: integer
                    maximum: 10
                  - type: integer
                    minimum: 11
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when both members declare an empty required list', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when an exclusive shared property is not required, without a discriminator', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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

    it('should report when both members require the same undeclared property', async () => {
      expect(
        await lint(`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                oneOf:
                  - type: object
                    required: [documentType, fileId]
                    properties:
                      fileId:
                        type: string
                  - type: object
                    title: Second
                    required: [documentType, fileId]
                    properties:
                      fileId:
                        type: string
        `)
      ).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and \`Second\`. Both schemas define \`fileId\` without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when members are separated by a nested allOf', async () => {
      expect(
        await lint(`
          openapi: 3.1.0
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
                      id:
                        type: string
                    allOf:
                      - type: object
                        required: [kind]
                        properties:
                          kind:
                            enum: [dog]
                  - type: object
                    properties:
                      id:
                        type: string
                    allOf:
                      - type: object
                        required: [kind]
                        properties:
                          kind:
                            enum: [cat]
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report the discriminator property as required when members do not declare it', async () => {
      expect(
        await lint(`
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
                  name:
                    type: string
              Dog:
                type: object
                properties:
                  name:
                    type: string
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report members that differ only by format', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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

    it('should not report when the parent is nullable and a single member accepts null', async () => {
      expect(
        await lint(`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                nullable: true
                oneOf:
                  - type: string
                    nullable: true
                  - type: integer
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when a required property with exclusive values tells the members apart', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when members share a property with no constraint that tells them apart', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report both a structural problem and an overlap in the same oneOf', async () => {
      expect(
        await lint(`
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
                  - type: string
                    title: Text
                  - {}
        `)
      ).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/oneOf/2",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema in \`oneOf\` is empty, so it matches any value.",
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
            "message": "Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: schema at position 1 and \`Text\`. Both schemas accept \`string\`.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });
  });

  describe('anyOf', () => {
    it('should report when anyOf has only one schema', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('allOf', () => {
    it('should report an allOf wrapper that adds nothing', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report a single-schema allOf declaring a subtype of a discriminated schema', async () => {
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report an empty allOf', async () => {
      expect(
        await lint(`
          openapi: 3.1.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              Test:
                allOf: []
        `)
      ).toMatchInlineSnapshot(`
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
      expect(
        await lint(`
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
        `)
      ).toMatchInlineSnapshot(`
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
    expect(
      await lint(`
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
      `)
    ).toMatchInlineSnapshot(`
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
