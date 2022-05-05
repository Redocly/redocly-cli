import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-security-defined', () => {
  it('should report on securityRequirements object if security scheme is not defined in components', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
              get:
                security:
                  - some: []`,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-security-defined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1pets/get/security/0/some",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "There is no \`some\` security scheme defined.",
          "ruleId": "operation-security-defined",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on securityRequirements object if security scheme is defined in components', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pets:
          get:
            security:
              some: []
      components:
        securitySchemes:
          some:
            type: http
            scheme: basic`,
      'foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'operation-security-defined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
