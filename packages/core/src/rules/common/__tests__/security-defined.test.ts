import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 security-defined', () => {
  it('should report on securityRequirements object if security scheme is not defined in components', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
              get:
                security:
                  - some: []`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'security-defined': 'error' }),
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
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report if security defined with an empty array', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          security: []
          paths:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'security-defined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should report if security not defined at all', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
              get:
                requestBody:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'security-defined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1pets/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report if security not defined for each operation', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
                get:
                  security:
                    - some: []
            /cats:
                get:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'security-defined': 'error' }),
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
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1cats/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
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
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'security-defined': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
