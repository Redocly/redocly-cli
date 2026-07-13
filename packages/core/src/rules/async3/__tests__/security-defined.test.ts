import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

async function lintMultiFileDocument(
  body: string,
  additionalDocuments: { absoluteRef: string; body: string }[]
) {
  const externalRefResolver = new BaseResolver();
  additionalDocuments.forEach((item) =>
    externalRefResolver.cache.set(
      item.absoluteRef,
      Promise.resolve(parseYamlToDocument(item.body, item.absoluteRef))
    )
  );
  return await lintDocument({
    externalRefResolver,
    document: parseYamlToDocument(body, '/asyncapi.yaml'),
    config: await createConfig({ rules: { 'security-defined': 'error' } }),
  });
}

describe('Async3 security-defined', () => {
  it('should report when an operation references an undefined security scheme via $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security:
              - $ref: '#/components/securitySchemes/undefinedScheme'
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
              "pointer": "#/operations/sendMessage/security/0",
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

  it('should report when the referenced security scheme has no value (half-finished YAML)', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        components:
          securitySchemes:
            apiKeyAuth:
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
              "pointer": "#/operations/sendMessage/security/0",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "There is no \`apiKeyAuth\` security scheme defined.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when a server references an undefined security scheme via $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/missingScheme'
        channels:
          some/channel:
            address: some/channel
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
              "pointer": "#/servers/production/security/0",
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

  it('should not report when all $refs resolve to defined schemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
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

  it('should report when the operation security array is empty and no server secures it', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security: []
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
              "pointer": "#/operations/sendMessage",
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

  it('should not report when the operation security array is empty but an applicable server is secured', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security: []
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

  it('should report when a $ref points outside components.securitySchemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            security:
              - $ref: '#/components/schemas/SomethingElse'
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          schemas:
            SomethingElse:
              type: object
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
              "pointer": "#/operations/sendMessage/security/0",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should still check security for a root operation that $refs into components.operations', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            $ref: '#/components/operations/SendMessage'
        components:
          operations:
            SendMessage:
              action: send
              channel:
                $ref: '#/channels/some~1channel'
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
              "pointer": "#/operations/sendMessage",
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
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
          public:
            host: kafka.public.example.com
            protocol: kafka
        channels:
          some/channel:
            address: some/channel
            servers:
              - $ref: '#/servers/production'
              - $ref: '#/servers/public'
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
              "pointer": "#/operations/sendMessage",
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

  it('should not report when security is declared via an operation trait', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
            traits:
              - $ref: '#/components/operationTraits/secured'
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          operationTraits:
            secured:
              security:
                - $ref: '#/components/securitySchemes/apiKeyAuth'
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
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        channels:
          some/channel:
            address: some/channel
            servers: []
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security: []
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
              "pointer": "#/operations/sendMessage",
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

  it('should report when the operation channel is bound only to servers without security', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          secured:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
          insecure:
            host: kafka.internal
            protocol: kafka
        channels:
          some/channel:
            address: some/channel
            servers:
              - $ref: '#/servers/insecure'
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
              "pointer": "#/operations/sendMessage",
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

  it('should not report on reusable operations under components.operations', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          production:
            host: kafka.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/apiKeyAuth'
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            $ref: '#/components/operations/sendMessage'
        components:
          securitySchemes:
            apiKeyAuth:
              type: apiKey
              in: user
          operations:
            sendMessage:
              action: send
              channel:
                $ref: '#/channels/some~1channel'
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
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            action: send
            channel:
              $ref: '#/channels/some~1channel'
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
              "pointer": "#/operations/sendMessage",
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

  it('should not report when a referenced operation is secured via a trait in its own file', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          some/channel:
            address: some/channel
        operations:
          sendMessage:
            $ref: '/ops.yaml#/operations/sendMessage'
      `,
      [
        {
          absoluteRef: '/ops.yaml',
          body: outdent`
            asyncapi: '3.0.0'
            info:
              title: Ops
              version: 1.0.0
            operations:
              sendMessage:
                action: send
                channel:
                  $ref: '/asyncapi.yaml#/channels/some~1channel'
                traits:
                  - $ref: '#/components/operationTraits/secured'
            components:
              operationTraits:
                secured:
                  security:
                    - $ref: '#/components/securitySchemes/apiKeyAuth'
              securitySchemes:
                apiKeyAuth:
                  type: apiKey
                  in: user
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when a referenced operation is secured by channel servers in its own file', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        operations:
          sendMessage:
            $ref: '/ops.yaml#/operations/sendMessage'
      `,
      [
        {
          absoluteRef: '/ops.yaml',
          body: outdent`
            asyncapi: '3.0.0'
            info:
              title: Ops
              version: 1.0.0
            servers:
              production:
                host: kafka.example.com
                protocol: kafka
                security:
                  - $ref: '#/components/securitySchemes/apiKeyAuth'
            channels:
              some/channel:
                address: some/channel
                servers:
                  - $ref: '#/servers/production'
            operations:
              sendMessage:
                action: send
                channel:
                  $ref: '#/channels/some~1channel'
            components:
              securitySchemes:
                apiKeyAuth:
                  type: apiKey
                  in: user
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when a referenced operation in another file has no security', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        operations:
          sendMessage:
            $ref: '/ops.yaml#/operations/sendMessage'
      `,
      [
        {
          absoluteRef: '/ops.yaml',
          body: outdent`
            asyncapi: '3.0.0'
            info:
              title: Ops
              version: 1.0.0
            channels:
              some/channel:
                address: some/channel
            operations:
              sendMessage:
                action: send
                channel:
                  $ref: '#/channels/some~1channel'
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/operations/sendMessage",
              "reportOnKey": true,
              "source": "/asyncapi.yaml",
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

  it('should not report when root servers is a map-level $ref to a secured server in another file', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          $ref: '/servers.yaml'
        channels:
          myChannel:
            address: user/signedup
        operations:
          sendUserSignedUp:
            action: send
            channel:
              $ref: '#/channels/myChannel'
      `,
      [
        {
          absoluteRef: '/servers.yaml',
          body: outdent`
            prod:
              host: example.com
              protocol: kafka
              security:
                - type: apiKey
                  in: user
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when operations is a map-level $ref and the operation is secured', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        servers:
          prod:
            host: example.com
            protocol: kafka
            security:
              - type: apiKey
                in: user
        channels:
          myChannel:
            address: user/signedup
        operations:
          $ref: '/operations.yaml'
      `,
      [
        {
          absoluteRef: '/operations.yaml',
          body: outdent`
            sendUserSignedUp:
              action: send
              channel:
                $ref: '/asyncapi.yaml#/channels/myChannel'
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when operations is a map-level $ref and an operation has no security', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          myChannel:
            address: user/signedup
        operations:
          $ref: '/operations.yaml'
      `,
      [
        {
          absoluteRef: '/operations.yaml',
          body: outdent`
            sendUserSignedUp:
              action: send
              channel:
                $ref: '/asyncapi.yaml#/channels/myChannel'
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/sendUserSignedUp",
              "reportOnKey": true,
              "source": "/operations.yaml",
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

  it('should not report when security $refs point to a security scheme in an external file', async () => {
    const results = await lintMultiFileDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Async3 External Security Ref
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: mqtt
            security:
              - $ref: '/apiKey.yaml'
        channels:
          userSignups:
            address: user/signedup
        operations:
          sendUserSignups:
            action: send
            channel:
              $ref: '#/channels/userSignups'
            security:
              - $ref: '/apiKey.yaml'
      `,
      [
        {
          absoluteRef: '/apiKey.yaml',
          body: outdent`
            type: httpApiKey
            name: api_key
            in: header
            description: API key security scheme defined in an external file
          `,
        },
      ]
    );

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
