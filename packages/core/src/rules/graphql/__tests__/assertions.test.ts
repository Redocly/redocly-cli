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
              property: description
            assertions:
              defined: true
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

  it('applies name-based asserts to the node itself when `property` is omitted', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/type-names-pascal-case:
            subject:
              type: ObjectTypeDefinition
            assertions:
              casing: PascalCase
      `
    );
    const results = await lintFromString({
      source: outdent`
        type wrongCase {
          name: String
        }

        type CorrectCase {
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
          "message": "rule/type-names-pascal-case failed because the ObjectTypeDefinition didn't meet the assertions: "wrongCase" should use PascalCase",
          "ruleId": "rule/type-names-pascal-case",
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

  it('checks the node name when no property is specified — flags a non-camelCase field, passes a camelCase one', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/field-camel-case:
            subject:
              type: FieldDefinition
            assertions:
              casing: camelCase
      `
    );

    const failing = await lintFromString({
      source: outdent`
        type Query {
          BadName: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(failing)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 18,
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
          "message": "rule/field-camel-case failed because the FieldDefinition didn't meet the assertions: "BadName" should use camelCase",
          "ruleId": "rule/field-camel-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);

    const passing = await lintFromString({
      source: outdent`
        type Query {
          goodName: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(passing)).toMatchInlineSnapshot(`[]`);
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

    const failing = await lintFromString({
      source: outdent`
        directive @internal(reason: String!) on FIELD_DEFINITION
        type Query {
          field: String @internal(reason: "hi")
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(failing)).toMatchInlineSnapshot(`
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

    const passing = await lintFromString({
      source: outdent`
        directive @internal(reason: String!) on FIELD_DEFINITION
        type Query {
          field: String @internal(reason: "long enough reason here")
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(passing)).toMatchInlineSnapshot(`[]`);
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

    const failing = await lintFromString({
      source: outdent`
        type Foo {
          name: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(failing)).toMatchInlineSnapshot(`
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

    const passing = await lintFromString({
      source: outdent`
        type Bar {
          id: ID
          name: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(passing)).toMatchInlineSnapshot(`[]`);
  });

  it('checks list of enum value names when property is "values" — required value missing vs. present', async () => {
    const config = await createConfig(
      outdent`
        rules:
          rule/status-requires-active:
            subject:
              type: EnumTypeDefinition
              property: values
            assertions:
              required: [ACTIVE]
      `
    );

    const failing = await lintFromString({
      source: outdent`
        enum Status {
          INACTIVE
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(failing)).toMatchInlineSnapshot(`
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
          "message": "rule/status-requires-active failed because the EnumTypeDefinition values didn't meet the assertions: ACTIVE is required",
          "ruleId": "rule/status-requires-active",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);

    const passing = await lintFromString({
      source: outdent`
        enum Status {
          ACTIVE
          INACTIVE
        }
      `,
      absoluteRef: 'schema.graphql',
      config,
    });

    expect(replaceSourceWithRef(passing)).toMatchInlineSnapshot(`[]`);
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
