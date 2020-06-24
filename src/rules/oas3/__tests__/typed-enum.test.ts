import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('Oas3 typed enum', () => {
  it('should not report on enum object if all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: A paged array of pets
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - 2
                            - 3
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should report on enum object if not all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - string
                            - 3
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected \\"integer\\" but received \\"string\\"",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
