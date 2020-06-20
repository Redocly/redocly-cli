import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('OAS3 operation-operationId-valid-in-url', () => {
  it('should report on invalid operationIds', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get:
                operationId: "valid"
              put:
                operationId: "invalid❤️"
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: { 'operation-operationId-valid-in-url': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/put/operationId",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation id should not have URL invalid characters.",
          "ruleId": "operation-operationId-valid-in-url",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
