import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 response-contains-header', () => {
  it('oas3-response-contains-header: should report on response object when not contains header', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
			`,
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: makeConfig({
        'response-contains-header': {
          severity: 'error',
          mustExist: ['Content-Length'],
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/headers",
              "reportOnKey": false,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must have a top-level \\"Content-Length\\" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
