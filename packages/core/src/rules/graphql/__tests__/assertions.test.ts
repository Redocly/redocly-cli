import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';
import { colorOptions } from '../../../logger.js';

describe('GraphQL configurable rules (rule/*)', () => {
  beforeAll(() => {
    colorOptions.enabled = false;
  });
  it('reports a casing violation via a configurable rule while ignoring a correct one', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/graphql-type-casing:
            subject:
              type: ObjectTypeDefinition
              property: name
            assertions:
              casing: PascalCase
      `
    );
    const results = await lintFromString({
      source: outdent`
        type wrongCasing {
          ping: String
        }

        type Correct {
          name: String!
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 17,
                "line": 1,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 6,
                "line": 1,
              },
            },
          ],
          "message": "rule/graphql-type-casing failed because the ObjectTypeDefinition name didn't meet the assertions: "wrongCasing" should use PascalCase",
          "ruleId": "rule/graphql-type-casing",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('narrows a configurable rule with `where` to fields of the Query type only', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/query-fields-camel-case:
            subject:
              type: FieldDefinition
              property: name
            assertions:
              casing: camelCase
            where:
              - subject:
                  type: ObjectTypeDefinition
                  property: name
                assertions:
                  const: Query
      `
    );
    const results = await lintFromString({
      source: outdent`
        type Query {
          BadQueryField: String
        }

        type Other {
          BadOtherField: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 16,
                "line": 2,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 3,
                "line": 2,
              },
            },
          ],
          "message": "rule/query-fields-camel-case failed because the FieldDefinition name didn't meet the assertions: "BadQueryField" should use camelCase",
          "ruleId": "rule/query-fields-camel-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('narrows the subject itself when the last `where` entry has the same type as the subject', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/input-description-required:
            subject:
              type: InputObjectTypeDefinition
            assertions:
              required: ['description']
            where:
              - subject:
                  type: InputObjectTypeDefinition
                  property: name
                assertions:
                  notPattern: /^Internal/
      `
    );
    const results = await lintFromString({
      source: outdent`
        input CreateUser {
          name: String
        }

        """
        Documented input.
        """
        input UpdateUser {
          name: String
        }

        input InternalPayload {
          data: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    // Only CreateUser is reported: UpdateUser has a description and InternalPayload, also undescribed, is exempted by the `where`.
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 2,
                "line": 3,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 1,
                "line": 1,
              },
            },
          ],
          "message": "rule/input-description-required failed because the InputObjectTypeDefinition didn't meet the assertions: description is required",
          "ruleId": "rule/input-description-required",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('applies key-based asserts to the node itself when `property` is omitted', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/type-description-required:
            subject:
              type: ObjectTypeDefinition
            assertions:
              required: ['description']
      `
    );
    const results = await lintFromString({
      source: outdent`
        """
        Documented type.
        """
        type Documented {
          name: String
        }

        type Undocumented {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 2,
                "line": 10,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 1,
                "line": 8,
              },
            },
          ],
          "message": "rule/type-description-required failed because the ObjectTypeDefinition didn't meet the assertions: description is required",
          "ruleId": "rule/type-description-required",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('interpolates message placeholders like the OAS assertions do', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/graphql-type-casing:
            subject:
              type: ObjectTypeDefinition
              property: name
            assertions:
              casing: PascalCase
            message: '{{problems}} ({{assertionName}} on {{nodeType}}.{{property}} in {{file}})'
      `
    );
    const results = await lintFromString({
      source: outdent`
        type wrongCasing {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 17,
                "line": 1,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 6,
                "line": 1,
              },
            },
          ],
          "message": ""wrongCasing" should use PascalCase (rule/graphql-type-casing on ObjectTypeDefinition.name in schema.graphql)",
          "ruleId": "rule/graphql-type-casing",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('allows configure the severity of a configurable rule', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/graphql-type-casing:
            severity: warn
            subject:
              type: ObjectTypeDefinition
              property: name
            assertions:
              casing: PascalCase
      `
    );
    const results = await lintFromString({
      source: outdent`
        type wrongCasing {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(results[0].ruleId).toEqual('rule/graphql-type-casing');
    expect(results[0].severity).toEqual('warn');
  });
});
