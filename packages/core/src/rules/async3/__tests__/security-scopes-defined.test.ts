import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Async3 security-scopes-defined', () => {
  it('should report scopes that are not listed in the available scopes of the flows', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/broker_auth'
        channels: {}
        components:
          securitySchemes:
            broker_auth:
              type: oauth2
              scopes:
                - write:events
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'security-scopes-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/securitySchemes/broker_auth/scopes/0",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "The "write:events" scope is not defined in the available scopes of the security scheme flows.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the scheme scopes are listed in the available scopes', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/broker_auth'
        channels: {}
        components:
          securitySchemes:
            broker_auth:
              type: oauth2
              scopes:
                - read:events
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'security-scopes-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should resolve $ref-ed flows when collecting available scopes', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/shared_flows_auth'
              - $ref: '#/components/securitySchemes/shared_flow_auth'
        channels: {}
        components:
          securitySchemes:
            base_auth:
              type: oauth2
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
            shared_flows_auth:
              type: oauth2
              scopes:
                - read:events
              flows:
                $ref: '#/components/securitySchemes/base_auth/flows'
            shared_flow_auth:
              type: oauth2
              scopes:
                - read:events
                - missing:scope
              flows:
                clientCredentials:
                  $ref: '#/components/securitySchemes/base_auth/flows/clientCredentials'
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'security-scopes-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/securitySchemes/shared_flow_auth/scopes/1",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "The "missing:scope" scope is not defined in the available scopes of the security scheme flows.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report oauth2 schemes that are not referenced by any security list', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: kafka
        channels: {}
        components:
          securitySchemes:
            unused_without_scopes:
              type: oauth2
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
            unused_with_unknown_scope:
              type: oauth2
              scopes:
                - write:events
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'security-scopes-defined': { severity: 'error', requireScopes: true } },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report oauth2 schemes without scopes when requireScopes is set', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            host: broker.example.com
            protocol: kafka
            security:
              - $ref: '#/components/securitySchemes/broker_auth'
        channels: {}
        components:
          securitySchemes:
            broker_auth:
              type: oauth2
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  availableScopes:
                    read:events: Read events
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'security-scopes-defined': { severity: 'error', requireScopes: true } },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/securitySchemes/broker_auth",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "The security scheme must list at least one scope.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
