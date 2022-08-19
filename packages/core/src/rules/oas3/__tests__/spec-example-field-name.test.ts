import { makeConfig, parseYamlToDocument } from '../../../../__tests__/utils';
import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('Oas3 spec-example-field-name', () => {
  it('should report a key of the example does not match the regular expression', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.0
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            parameters:
              - name: petId
                in: path
                schema:
                  type: integer
                  format: int64
                examples:
                  invalid identifier:
                      description: 'Some description'
                      value: 21
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'spec-example-field-name': 'error',
      }),
    });

    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/parameters/0/examples/invalid identifier",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            parameters:
              - name: petId
                in: path
                schema:
                  type: integer
                  format: int64
                examples:
                  invalid identifier:
                      description: 'Some description'
                      value: 21",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The key of the example \\"invalid identifier\\" does not match the regular expression \\"^[a-zA-Z0-9.\\\\-_]+$\\"",
          "ruleId": "spec-example-field-name",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report a key of the example does not match the regular expression', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.0
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            parameters:
              - name: petId
                in: path
                schema:
                  type: integer
                  format: int64
                examples:
                  valid-identifier-1.key:
                      description: 'Some description'
                      value: 21
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'spec-example-field-name': 'error',
      }),
    });

    expect(results).toMatchInlineSnapshot(`Array []`);
  });
});
