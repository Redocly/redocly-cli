import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Async2 security-defined', () => {
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
        rules: { 'security-defined': 'error' },
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
          "ruleId": "security-defined",
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
        rules: { 'security-defined': 'error' },
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
          "ruleId": "security-defined",
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
        rules: { 'security-defined': 'error' },
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when an applicable server already has security defined', async () => {
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when a channel has an empty servers list and all servers are secured', async () => {
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
            servers: []
            subscribe:
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when an applicable server has an empty security array', async () => {
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
            security: []
        channels:
          some/channel:
            subscribe:
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/some~1channel/subscribe",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Every operation should have security defined on it.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when the channel is bound only to servers without security', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          secured:
            url: kafka.example.com
            protocol: kafka
            security:
              - apiKeyAuth: []
          insecure:
            url: kafka.internal
            protocol: kafka
        channels:
          some/channel:
            servers:
              - insecure
            subscribe:
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/some~1channel/subscribe",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Every operation should have security defined on it.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when channel is bound to both secured and unsecured servers', async () => {
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
          public:
            url: kafka.public.example.com
            protocol: kafka
        channels:
          some/channel:
            servers:
              - production
              - public
            subscribe:
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/some~1channel/subscribe",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Every operation should have security defined on it.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should ignore reusable component servers without security when checking applicability', async () => {
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
              message:
                messageId: Message1
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          servers:
            staging:
              url: kafka.staging.example.com
              protocol: kafka
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should ignore reusable component channels without security when checking applicability', async () => {
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
          staging:
            url: kafka.staging.example.com
            protocol: kafka
        channels:
          some/channel:
            servers:
              - production
            subscribe:
              message:
                messageId: Message1
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          channels:
            reusableChannel:
              servers:
                - staging
              subscribe:
                message:
                  messageId: Message2
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when security is declared via an operation trait', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            subscribe:
              traits:
                - $ref: '#/components/operationTraits/secured'
              message:
                messageId: Message1
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          operationTraits:
            secured:
              security:
                - apiKeyAuth: []
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when an operation has no security defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            subscribe:
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
        rules: { 'security-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/some~1channel/subscribe",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Every operation should have security defined on it.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
