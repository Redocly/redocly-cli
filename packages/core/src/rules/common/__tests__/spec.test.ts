import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 spec', () => {
  it('should report missing schema property', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        '/test':
          get:
            summary: Gets a specific pet
            parameters:
            - name: petId
              in: path
            responses:
              200:
                description: Ok
        `,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: makeConfig({ 'spec': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The field \`info\` must be present on this level.",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/get/parameters/0",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "A parameter must contain either a \`schema\` property, or a \`content\` property, but not both.",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
