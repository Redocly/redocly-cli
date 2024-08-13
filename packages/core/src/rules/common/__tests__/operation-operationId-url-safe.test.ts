import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import {
  parseYamlToDocument,
  replaceSourceWithRef,
  makeConfig,
} from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';

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
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-operationId-url-safe': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/operationId",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation \`operationId\` should not have URL invalid characters.",
          "ruleId": "operation-operationId-url-safe",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
