import { outdent } from 'outdent';
import { LintConfig } from '../../../config/config';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 paths-kebab-case', () => {
  it('should report on camelCase path', async () => {
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
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'paths-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1someTest",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/someTest\` should be in kebab-case.",
          "ruleId": "paths-kebab-case",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on snake_case path', async () => {
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
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'paths-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1some_test",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/some_test\` should be in kebab-case.",
          "ruleId": "paths-kebab-case",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
