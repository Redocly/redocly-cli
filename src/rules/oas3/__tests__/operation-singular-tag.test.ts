import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('OAS3 operation-singular-tag', () => {
  it('should report on operation object if more than one tag', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: a
            - name: b
          paths:
            /some:
              get:
                tags:
                  - a
                  - b
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'operation-singular-tag': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1some/get/tags",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation \\"tags\\" object should have only one tag.",
          "ruleId": "operation-singular-tag",
          "severity": "error",
        },
      ]
    `);
  });

  it('should not report on operation object if only one tag', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      tags:
        - name: a
      paths:
        /some:
          get:
            tags:
              - a
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'operation-singular-tag': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
