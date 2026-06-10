import { outdent } from 'outdent';

import { replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintFromString } from '../../../lint.js';

describe('GraphQL configurable rules (rule/*)', () => {
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
          "message": ""wrongCasing" should use PascalCase",
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
