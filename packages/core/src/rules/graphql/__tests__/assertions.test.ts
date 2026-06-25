import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';
import { colorOptions } from '../../../logger.js';

describe('GraphQL configurable rules (rule/*)', () => {
  beforeAll(() => {
    colorOptions.enabled = false;
  });
  it('reports a casing violation on the type name via a configurable rule while ignoring a correct one (when no property is specified)', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/graphql-type-casing:
            subject:
              type: ObjectTypeDefinition
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
          "message": "rule/graphql-type-casing failed because the ObjectTypeDefinition didn't meet the assertions: "wrongCasing" should use PascalCase",
          "ruleId": "rule/graphql-type-casing",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports a casing violation on the type name via a configurable rule while ignoring a correct one (with the name property specified explicitly)', async () => {
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
            assertions:
              casing: camelCase
            where:
              - subject:
                  type: ObjectTypeDefinition
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
          "message": "rule/query-fields-camel-case failed because the FieldDefinition didn't meet the assertions: "BadQueryField" should use camelCase",
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
              property: description
            assertions:
              defined: true
            where:
              - subject:
                  type: InputObjectTypeDefinition
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

    // CreateUser fails (no description). UpdateUser passes (has description).
    // InternalPayload is exempted by the `where`.
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
          "message": "rule/input-description-required failed because the InputObjectTypeDefinition description didn't meet the assertions: Should be defined",
          "ruleId": "rule/input-description-required",
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
          "message": ""wrongCasing" should use PascalCase (rule/graphql-type-casing on ObjectTypeDefinition. in schema.graphql)",
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
          "message": "rule/graphql-type-casing failed because the ObjectTypeDefinition didn't meet the assertions: "wrongCasing" should use PascalCase",
          "ruleId": "rule/graphql-type-casing",
          "severity": "warn",
          "suggest": [],
        },
      ]
    `);
  });

  it('checks the literal value of a StringValue node when no property is specified', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/internal-reason-length:
            subject:
              type: StringValue
            assertions:
              minLength: 10
            where:
              - subject:
                  type: Directive
                assertions:
                  const: internal
      `
    );

    const results = await lintFromString({
      source: outdent`
        directive @internal(reason: String!) on FIELD_DEFINITION
        type Query {
          short: String @internal(reason: "hi")
          long: String @internal(reason: "long enough reason here")
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
                "col": 39,
                "line": 3,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 35,
                "line": 3,
              },
            },
          ],
          "message": "rule/internal-reason-length failed because the StringValue didn't meet the assertions: Should have at least 10 characters",
          "ruleId": "rule/internal-reason-length",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('checks list of field names when property is "fields" — required field missing vs. present', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/type-requires-id:
            subject:
              type: ObjectTypeDefinition
              property: fields
            assertions:
              required: [id]
      `
    );

    const results = await lintFromString({
      source: outdent`
        type Foo {
          name: String
        }

        type Bar {
          id: ID
          name: String
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
          "message": "rule/type-requires-id failed because the ObjectTypeDefinition fields didn't meet the assertions: id is required",
          "ruleId": "rule/type-requires-id",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('where narrowing by name limits field checks to the named interface only', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/target-interface-requires-id:
            subject:
              type: InterfaceTypeDefinition
              property: fields
            assertions:
              required: [id]
            where:
              - subject:
                  type: InterfaceTypeDefinition
                assertions:
                  const: Target
      `
    );

    const results = await lintFromString({
      source: outdent`
        interface Target {
          name: String
        }
        interface Other {
          name: String
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
          "message": "rule/target-interface-requires-id failed because the InterfaceTypeDefinition fields didn't meet the assertions: id is required",
          "ruleId": "rule/target-interface-requires-id",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
