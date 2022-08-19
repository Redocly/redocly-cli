import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas2 operation-4xx-problem-details-rfc7807', () => {
  it('should report `4xx` must have `schema` property', async () => {
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
                  description: User
                '404':
                  description: User not found
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-4xx-problem-details-rfc7807': 'error' }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/404/schema",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Response object should contain \`schema\` field.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
  it('should report `4xx` must have `type` property', async () => {
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
                  description: User
                '404':
                  description: User not found
                  schema:
                    type: 'object'
                    properties:
                      asd:
                        type: string
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-4xx-problem-details-rfc7807': 'error' }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/404/schema/properties/type",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`type\` field.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/404/schema/properties/title",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`title\` field.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
