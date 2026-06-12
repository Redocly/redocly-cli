import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';

describe('GraphQL no-unused-types', () => {
  it('flags an unused type without transitively flagging the types only it references', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          a: A
        }

        type A {
          name: String
        }

        type B {
          c: C
        }

        type C {
          name: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    // `B` is unused; `C` is referenced only by `B` but is deliberately not reported.
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 7,
                "line": 9,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 6,
                "line": 9,
              },
            },
          ],
          "message": "Type \`B\` is declared but never used.",
          "ruleId": "no-unused-types",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports an orphan type at its name location', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }

        type Orphan {
          x: Int
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 12,
                "line": 5,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 6,
                "line": 5,
              },
            },
          ],
          "message": "Type \`Orphan\` is declared but never used.",
          "ruleId": "no-unused-types",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report root operation types even when unreferenced', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }

        type Mutation {
          noop: Boolean
        }

        type Subscription {
          tick: Int
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('honors an explicit schema block with non-default root names', async () => {
    const results = await lintFromString({
      source: outdent`
        schema {
          query: RootQuery
        }

        type RootQuery {
          a: A
        }

        type A {
          name: String
        }

        type Query {
          unused: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    // `Query` is just a regular type here (not a root), so it is unused.
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "end": {
                "col": 11,
                "line": 13,
              },
              "pointer": undefined,
              "source": "schema.graphql",
              "start": {
                "col": 6,
                "line": 13,
              },
            },
          ],
          "message": "Type \`Query\` is declared but never used.",
          "ruleId": "no-unused-types",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report a scalar used only as a directive argument', async () => {
    const results = await lintFromString({
      source: outdent`
        directive @auth(role: Role) on FIELD_DEFINITION

        scalar Role

        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('does not report reachable union, interface, input, and enum types', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          search(filter: SearchFilter): SearchResult
          node: Node
        }

        union SearchResult = Book | Author

        type Book implements Node {
          id: ID
        }

        type Author implements Node {
          id: ID
        }

        interface Node {
          id: ID
        }

        input SearchFilter {
          kind: Kind
        }

        enum Kind {
          BOOK
          AUTHOR
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('reports nothing when the document has no root operation type', async () => {
    const results = await lintFromString({
      source: outdent`
        type Address {
          street: String
        }

        type Money {
          amount: Int
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'no-unused-types': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
