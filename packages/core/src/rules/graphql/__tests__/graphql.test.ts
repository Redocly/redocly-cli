import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';

describe('GraphQL SDL linting', () => {
  it('reports no problems for a valid schema', async () => {
    const results = await lintFromString({
      source: outdent`
        """Root query type."""
        type Query {
          """Fetch a user by id."""
          user(id: ID!): User
        }

        """A registered user."""
        type User {
          id: ID!
          name: String!
          email: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ extends: ['all'] }),
    });

    expect(results).toHaveLength(0);
  });

  it('reports a syntax error via the struct rule and short-circuits', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          user(id: ID!): User
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 22,
                "line": 2,
              },
            },
          ],
          "message": "Syntax Error: Expected Name, found <EOF>.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports a clear message for an empty document instead of a raw EOF syntax error', async () => {
    const results = await lintFromString({
      source: '   \n  ',
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 1,
                "line": 1,
              },
            },
          ],
          "message": "The GraphQL document is empty. Expected at least one type definition.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports schema-validity errors via the struct rule and suggests a correction if possible', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          user: Use
        }

        type User {
          name: String!
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 2,
                "line": 7,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 1,
                "line": 1,
              },
            },
          ],
          "message": "Unknown type "Use". Did you mean "User"?",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('lets config redefine the severity of a ruleset rule', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({
        extends: ['all'],
        rules: { 'type-description': 'warn' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 11,
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
          "message": "Type \`Query\` should have a non-empty description.",
          "ruleId": "type-description",
          "severity": "warn",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not run a rule when turned off in config', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({
        extends: ['all'],
        rules: { 'type-description': 'off' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
