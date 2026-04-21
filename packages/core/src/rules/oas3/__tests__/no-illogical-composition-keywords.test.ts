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
                "reportOnKey": false,
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

    it('should report when oneOf contains an empty schema {}', async () => {
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
            "message": "Schema is empty.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when oneOf contains a null schema entry', async () => {
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
            "message": "Schema is empty.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report when oneOf contains a nullable-only schema (no type constraints)', async () => {
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
            "message": "Schema is empty.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
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
                "reportOnKey": false,
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
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. Schemas have overlapping properties: name.",
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
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. At least one schema allows additional properties (implicit or explicit \`additionalProperties: true\`), so a value valid for one may also satisfy the other. Set \`additionalProperties: false\` on both or add a discriminating required property.",
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
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Ambiguous oneOf schemas detected. Schemas at position 1 and at position 2 are not mutually exclusive. At least one schema allows additional properties (implicit or explicit \`additionalProperties: true\`), so a value valid for one may also satisfy the other. Set \`additionalProperties: false\` on both or add a discriminating required property.",
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
                "reportOnKey": false,
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

    it('should report when anyOf contains an empty schema', async () => {
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
      ).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/Test/anyOf/1",
                "reportOnKey": false,
                "source": "foobar.yaml",
              },
            ],
            "message": "Schema is empty.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });
  });

  describe('allOf', () => {
    it('should report when allOf contains an empty schema', async () => {
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
            "message": "Schema is empty.",
            "ruleId": "no-illogical-composition-keywords",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
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
  });
});
