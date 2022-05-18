import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 as3-no-servers-empty-enum', () => {
  it('oas3-no-servers-empty-enum: should report on server object with empty enum and unknown enum value', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables:
              var:
                enum: []
                default: a
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable with \`enum\` must be a non-empty array.",
          "ruleId": "no-servers-empty-enum",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable define \`enum\` and \`default\`. \`enum\` must include default value",
          "ruleId": "no-servers-empty-enum",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-no-servers-empty-enum: should report on server object with empty enum', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables:
              var:
                enum: []
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable with \`enum\` must be a non-empty array.",
          "ruleId": "no-servers-empty-enum",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-no-servers-empty-enum: should be success because variables is empty object', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables: {}
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('oas3-no-servers-empty-enum: should be success because variable is empty object', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables:
              var: {}
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('oas3-no-servers-empty-enum: should be success because enum contains default value', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables:
              var:
                enum:
                  - a
                default: a
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('oas3-no-servers-empty-enum: should be success because enum contains default value', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          title: API
          version: 1.0.0
        servers:
          - url: https://example.com/{var}
            variables:
              var:
                type: ['string', 'null']
                enum:
                  - 'some string'
                  - null
                default: 'some string'
        components: {}
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-servers-empty-enum': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
