import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-required-schema-properties-undefined', () => {
  it('should report if one or more of the required properties are missing', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                  - test
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-required-schema-properties-undefined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report if one or more of the required properties are missing when used in schema with allOf keyword', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                allOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                        description: The measured skill for hunting
                        default: lazy
                        example: adventurous
                        enum:
                          - clueless
                          - lazy
                          - adventurous
                          - aggressive
                    required:
                      - huntingSkill
                      - test
              Pet:
                type: object
                required:
                  - name
                  - photoUrls
                properties:
                  name:
                    description: The name given to a pet
                    type: string
                    example: Guru
                  photoUrls:
                    description: The list of URL to a cute photos featuring pet
                    type: array
                    maxItems: 20
                    xml:
                      name: photoUrl
                      wrapped: true
                    items:
                      type: string
                      format: url
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-required-schema-properties-undefined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Cat/allOf/1/required/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report with different message if more than one of the required properties are missing', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                  - test
                  - test2
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-required-schema-properties-undefined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/3",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test2' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if all of the required properties are present', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
                  test:
                    type: string
                    example: test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-required-schema-properties-undefined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
