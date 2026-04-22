import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Async2 asyncapi-operation-security-defined', () => {
  it('should report when an operation references an undefined security scheme', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            subscribe:
              security:
                - undefinedScheme: []
              message:
                messageId: Message1
        components:
          securitySchemes:
            knownScheme:
              type: apiKey
              in: user
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'asyncapi-operation-security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/some~1channel/subscribe/security/0/undefinedScheme",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "There is no \`undefinedScheme\` security scheme defined.",
          "ruleId": "asyncapi-operation-security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when a server references an undefined security scheme', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            url: kafka.example.com
            protocol: kafka
            security:
              - missingScheme: []
        channels:
          some/channel: {}
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'asyncapi-operation-security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/servers/production/security/0/missingScheme",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "There is no \`missingScheme\` security scheme defined.",
          "ruleId": "asyncapi-operation-security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when all referenced schemes are defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            url: kafka.example.com
            protocol: kafka
            security:
              - apiKeyAuth: []
        channels:
          some/channel:
            subscribe:
              security:
                - apiKeyAuth: []
              message:
                messageId: Message1
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'asyncapi-operation-security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when security array is empty', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            subscribe:
              security: []
              message:
                messageId: Message1
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'asyncapi-operation-security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
