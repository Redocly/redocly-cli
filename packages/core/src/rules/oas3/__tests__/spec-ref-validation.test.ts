import { makeConfig, parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('Oas3 spec-ref-validation', () => {
  it('should report about invalid usage of $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: "3.1.0"
      info:
        $ref: '#/components/schemas/test'
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
                        $ref: '#/components/schemas/test'
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
      components:
        schemas:
          test:
            type: object                    
		`
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'spec-ref-validation': 'error' }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/$ref",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Invalid usage of $ref",
          "ruleId": "spec-ref-validation",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/responses/201/content/application~1json/schema/properties/$ref",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Invalid usage of $ref",
          "ruleId": "spec-ref-validation",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
