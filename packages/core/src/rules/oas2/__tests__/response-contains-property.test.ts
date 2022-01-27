import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas2 response-contains-property', () => {
  it('oas2-response-contains-property: should report on response object when not contains properties', async () => {
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
              '200':
                description: Account object returned
                schema:
                  type: object
                  properties:
                    created_at:
                      description: Account creation date/time
                      format: date-time
                      type: string
                    owner_email:
                      description: Account Owner email
                      type: string
              '404':
                description: User not found
			`,
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: makeConfig({
        'response-contains-property': {
          severity: 'error',
          mustExist: ['id'],
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/200/schema/properties",
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
              '200':
                description: Account object returned
                schema:
                  type: object
                  properties:
                    created_at:
                      description: Account creation date/time
                      format: date-time
                      type: string
                    owner_email:
                      description: Account Owner email
                      type: string
              '404':
                description: User not found",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must have a top-level \\"id\\" property.",
          "ruleId": "response-contains-property",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
