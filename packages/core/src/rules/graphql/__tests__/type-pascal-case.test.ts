import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';

describe('GraphQL type-pascal-case', () => {
  it('reports non-PascalCase type names', async () => {
    const results = await lintFromString({
      source: outdent`
        type query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'type-pascal-case': 'error' } }),
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
          "message": "Type \`query\` should be in PascalCase.",
          "ruleId": "type-pascal-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports no problems for PascalCase type names', async () => {
    const results = await lintFromString({
      source: outdent`
        type Query {
          ping: String
        }
      `,
      absoluteRef: 'schema.graphql',
      config: await createConfig({ rules: { 'type-pascal-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
