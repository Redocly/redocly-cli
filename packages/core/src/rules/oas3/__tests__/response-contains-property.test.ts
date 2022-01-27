import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 response-contains-property', () => {
  it('oas3-response-contains-property: should report on response object when not contains properties', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
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
              "pointer": "#/paths/~1store~1subscribe/post/responses/201/content/application~1json/schema/properties",
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
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456",
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
