import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-4xx-response', () => {
  it('should report missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              put:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-4xx-response': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4xx\` response.",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report for present 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  400:
                    description: error response
        `,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-4xx-response': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should report if default is present but missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  default:
                    description: some default response
        `,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-4xx-response': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4xx\` response.",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
