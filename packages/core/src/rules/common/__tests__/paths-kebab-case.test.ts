import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('Oas3 paths-kebab-case', () => {
  it('should report on no kebab-case path', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /someTest:
              get:
                summary: List all pets
            /test-123:
              get:
                summary: Test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'paths-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1someTest",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/someTest\` does not use kebab-case.",
          "ruleId": "paths-kebab-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
  it('should report when snake_case is used', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some_test:
              get:
                summary: List all pets
            /test-123:
              get:
                summary: Test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'paths-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some_test",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/some_test\` does not use kebab-case.",
          "ruleId": "paths-kebab-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should allow trailing slash in path with "paths-kebab-case" rule', async () => {
    const document = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /some/:
                get:
                  summary: List all pets
          `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'paths-kebab-case': 'error',
          'no-path-trailing-slash': 'off',
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
