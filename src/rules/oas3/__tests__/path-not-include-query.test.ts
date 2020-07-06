import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 path-not-include-query', () => {
  it('should report on path object if query params in pathitem', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some?input:
              get:
                summary: List all pets
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'path-not-include-query': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1some?input",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Don't put query string items in the path, they belong in parameters with in: query.",
          "ruleId": "path-not-include-query",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on path object if no query params in pathitem', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /some:
          get:
            summary: List all pets
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'path-not-include-query': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
