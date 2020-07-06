import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-operationId-url-safe', () => {
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
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: { 'operation-operationId-url-safe': 'error' },
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
          "ruleId": "operation-operationId-url-safe",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
