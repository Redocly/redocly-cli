import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';

describe('GraphQL type-description', () => {
  it('reports types without a description', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'type-description': 'error' } }),
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
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports no problems when every type has a description', async () => {
    const results = await lintFromString({
      source: outdent`
        """Root query type."""
        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'type-description': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
