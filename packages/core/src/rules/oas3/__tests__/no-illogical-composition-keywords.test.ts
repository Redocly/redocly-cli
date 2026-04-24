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
      config: await createConfig({ rules: { 'no-illogical-composition-keywords': 'error' } }),
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
            "message": "Schema object 'oneOf' should contain at least 2 schemas. Use the schema directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when oneOf has only one schema but parent declares a discriminator', async () => {
      expect(
        await lint(`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              ReadyToPayKlarnaMethodFeature:
                type: object
                discriminator:
                  propertyName: name
                  mapping:
                    Klarna: '#/components/schemas/KlarnaFeature'
                oneOf:
                  - $ref: '#/components/schemas/KlarnaFeature'
              KlarnaFeature:
                type: object
                properties:
                  name:
                    type: string
                    enum: [Klarna]
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when oneOf contains an empty schema {}', async () => {
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
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when oneOf contains a null schema entry', async () => {
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
                  - type: "null"
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when oneOf contains a nullable-only schema (no type constraints)', async () => {
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
                  - nullable: true
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when oneOf contains duplicate schemas', async () => {
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
            "message": "Duplicate schemas found in 'oneOf', which makes it impossible to discriminate between schemas.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when oneOf schemas are not mutually exclusive (same type, no discriminator)', async () => {
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
                      name:
                        type: string
                  - type: object
                    properties:
                      name:
                        type: string
                      age:
                        type: integer
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. Schemas have overlapping properties: name. Consider using a discriminator or ensuring that shared properties have mutually exclusive constraints.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when oneOf schemas have different types', async () => {
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

    it('should not report when oneOf schemas are distinguished by a required property type', async () => {
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
                    required: [kind]
                    properties:
                      kind:
                        type: string
                        enum: [cat]
                  - type: object
                    required: [kind]
                    properties:
                      kind:
                        type: string
                        enum: [dog]
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when one oneOf schema has additionalProperties: false and another allows extras', async () => {
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
                      x:
                        type: string
                  - type: object
                    properties:
                      y:
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. At least one schema allows additional properties, so a value valid for one may also satisfy the other.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report overlap for OAS 3.1 schemas where type is an array including object', async () => {
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
                  - type: [object]
                    additionalProperties: false
                    properties:
                      x:
                        type: string
                  - type: [object]
                    properties:
                      y:
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. At least one schema allows additional properties, so a value valid for one may also satisfy the other.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when both oneOf schemas have additionalProperties: false and disjoint required properties', async () => {
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
                    required: [x]
                    properties:
                      x:
                        type: string
                  - type: object
                    additionalProperties: false
                    required: [y]
                    properties:
                      y:
                        type: string
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when oneOf schemas have disjoint required property sets (implicit additionalProperties: true)', async () => {
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
                    required: [username, password]
                    properties:
                      username:
                        type: string
                      password:
                        type: string
                  - type: object
                    required: [customerId]
                    properties:
                      customerId:
                        type: string
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report each overlapping pair separately when multiple oneOf schemas overlap', async () => {
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
                      name:
                        type: string
                  - type: object
                    properties:
                      name:
                        type: string
                      age:
                        type: integer
                  - type: object
                    properties:
                      name:
                        type: string
                      email:
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. Schemas have overlapping properties: name. Consider using a discriminator or ensuring that shared properties have mutually exclusive constraints.",
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 3 are not mutually exclusive. Schemas have overlapping properties: name. Consider using a discriminator or ensuring that shared properties have mutually exclusive constraints.",
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
            "message": "Ambiguous oneOf schemas detected. Schemas at position 2 and at position 3 are not mutually exclusive. Schemas have overlapping properties: name. Consider using a discriminator or ensuring that shared properties have mutually exclusive constraints.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when each oneOf schema has a required property absent from the other schema', async () => {
      expect(
        await lint(`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              ReadyToPay:
                type: object
                oneOf:
                  - type: object
                    required: [websiteId, amount, riskMetadata]
                    properties:
                      websiteId:
                        type: string
                      amount:
                        type: number
                      riskMetadata:
                        type: object
                  - type: object
                    required: [websiteId, items, riskMetadata]
                    properties:
                      websiteId:
                        type: string
                      items:
                        type: array
                      riskMetadata:
                        type: object
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when oneOf schemas have disjoint required properties but share optional properties', async () => {
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
                    required: [file]
                    properties:
                      file:
                        type: string
                      name:
                        type: string
                      isPublic:
                        type: boolean
                  - type: object
                    required: [url]
                    properties:
                      url:
                        type: string
                      name:
                        type: string
                      isPublic:
                        type: boolean
        `)
      ).toMatchInlineSnapshot(`[]`);
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
            "message": "Schema object 'anyOf' should contain at least 2 schemas. Use the schema directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when anyOf is used alongside a discriminator', async () => {
      expect(
        await lint(`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
          paths: {}
          components:
            schemas:
              PaymentInstrument:
                type: object
                discriminator:
                  propertyName: method
                  mapping:
                    card: '#/components/schemas/PaymentCard'
                    paypal: '#/components/schemas/PayPal'
                anyOf:
                  - $ref: '#/components/schemas/PaymentCard'
                  - $ref: '#/components/schemas/PayPal'
              PaymentCard:
                type: object
                properties:
                  method:
                    type: string
                    enum: [card]
              PayPal:
                type: object
                properties:
                  method:
                    type: string
                    enum: [paypal]
        `)
      ).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/PaymentInstrument/anyOf",
                "reportOnKey": true,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema uses 'anyOf' alongside a 'discriminator'. A 'discriminator' implies mutually exclusive variants — use 'oneOf' instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when anyOf has only one schema but parent declares a discriminator', async () => {
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
                  propertyName: type
                  mapping:
                    a: '#/components/schemas/A'
                anyOf:
                  - $ref: '#/components/schemas/A'
              A:
                type: object
                properties:
                  type:
                    type: string
                    enum: [a]
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report when anyOf contains an empty schema', async () => {
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
                  - {}
        `)
      ).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('allOf', () => {
    it('should not report when allOf contains an empty schema', async () => {
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
                  - type: object
                    properties:
                      name:
                        type: string
                  - {}
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should not report for a valid allOf', async () => {
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
                  - type: object
                    properties:
                      name:
                        type: string
                  - type: object
                    properties:
                      age:
                        type: integer
        `)
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should report when allOf has only one schema in OpenAPI 3.1', async () => {
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
                description: Website identifier.
                allOf:
                  - $ref: '#/components/schemas/WebsiteId'
              WebsiteId:
                type: string
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
            "message": "Schema object 'allOf' with a single member is redundant in OpenAPI 3.1. '$ref' supports sibling keywords natively — attach properties directly instead.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report when allOf has only one schema in OpenAPI 3.0', async () => {
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
                description: Website identifier.
                allOf:
                  - $ref: '#/components/schemas/WebsiteId'
              WebsiteId:
                type: string
        `)
      ).toMatchInlineSnapshot(`[]`);
    });
  });
});
