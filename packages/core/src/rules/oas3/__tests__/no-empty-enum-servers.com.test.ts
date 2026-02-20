import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-server-variables-empty-enum', () => {
  it('should report on server object with empty enum and unknown enum value', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable with \`enum\` must be a non-empty array.",
          "ruleId": "no-server-variables-empty-enum",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable define \`enum\` and \`default\`. \`enum\` must include default value",
          "ruleId": "no-server-variables-empty-enum",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on server object with empty enum', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/servers",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Server variable with \`enum\` must be a non-empty array.",
          "ruleId": "no-server-variables-empty-enum",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should be success because variables is empty object', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should be success because variable is empty object', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should be success because enum contains default value', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should be success because enum contains default value', async () => {
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
      config: await createConfig({ rules: { 'no-server-variables-empty-enum': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
