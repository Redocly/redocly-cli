import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas2 response-contains-header', () => {
  it('oas2-response-contains-header: should report on response object when not contains header', async () => {
    const document = parseYamlToDocument(
      outdent`
      swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Location:
                    description: Location of created Account
                    type: string
              '404':
                description: User not found
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
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/201/headers",
              "reportOnKey": false,
              "source": Source {
                "absoluteRef": "",
                "body": "swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Location:
                    description: Location of created Account
                    type: string
              '404':
                description: User not found",
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
