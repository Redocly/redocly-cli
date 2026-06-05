import { outdent } from 'outdent';

import { createConfig, type RuleConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

const allRules: Record<string, RuleConfig> = {
  struct: 'error',
  'type-description': 'error',
  'type-pascal-case': 'error',
};

async function lintGraphql(source: string, rules: Record<string, RuleConfig> = allRules) {
  return lintFromString({
    source,
    absoluteRef: 'schema.graphql',
    config: await createConfig({ rules }),
    externalRefResolver: new BaseResolver(),
  });
}

describe('GraphQL SDL linting', () => {
  it('reports no problems for a valid schema', async () => {
    const results = await lintGraphql(outdent`
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
    `);

    expect(results).toHaveLength(0);
  });

  it('reports a syntax error via the struct rule and short-circuits', async () => {
    const results = await lintGraphql(outdent`
      type Query {
        user(id: ID!): User
    `);

    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('struct');
    expect(results[0].severity).toBe('error');
    expect(results[0].message).toMatch(/Syntax Error/i);
    expect(results[0].location[0].pointer).toBeUndefined();
    expect(results[0].location[0]).toHaveProperty('start');
  });

  it('reports schema-validity errors via the struct rule', async () => {
    const results = await lintGraphql(outdent`
      type Query {
        user: User
      }
    `);

    const structProblems = results.filter((problem) => problem.ruleId === 'struct');
    expect(structProblems.length).toBeGreaterThan(0);
    expect(structProblems.every((problem) => problem.severity === 'error')).toBe(true);
  });

  it('reports types without a description via the type-description rule', async () => {
    const results = await lintGraphql(
      outdent`
        type Query {
          ping: String
        }
      `,
      { struct: 'off', 'type-description': 'error' }
    );

    const descriptionProblems = results.filter((problem) => problem.ruleId === 'type-description');
    expect(descriptionProblems.length).toBeGreaterThan(0);
    expect(descriptionProblems[0].message).toMatch(/description/i);
  });

  it('reports non-PascalCase type names via the type-pascal-case rule', async () => {
    const results = await lintGraphql(
      outdent`
        """A type with a bad name."""
        type query {
          ping: String
        }
      `,
      { struct: 'off', 'type-pascal-case': 'error' }
    );

    const pascalProblems = results.filter((problem) => problem.ruleId === 'type-pascal-case');
    expect(pascalProblems.length).toBeGreaterThan(0);
    expect(pascalProblems[0].message).toMatch(/PascalCase/i);
  });

  it('respects severity from config (warn)', async () => {
    const results = await lintGraphql(
      outdent`
        type query {
          ping: String
        }
      `,
      { struct: 'off', 'type-pascal-case': 'warn', 'type-description': 'off' }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((problem) => problem.severity === 'warn')).toBe(true);
  });

  it('does not run rules turned off in config', async () => {
    const results = await lintGraphql(
      outdent`
        type query {
          ping: String
        }
      `,
      { struct: 'off', 'type-pascal-case': 'off', 'type-description': 'off' }
    );

    expect(results).toHaveLength(0);
  });
});
