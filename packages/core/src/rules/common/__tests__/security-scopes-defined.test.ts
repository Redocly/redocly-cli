import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 security-scopes-defined', () => {
  it('should report scopes that are not defined in the security scheme flows', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pets:
            get:
              security:
                - petstore_auth:
                    - read:pet
        components:
          securitySchemes:
            petstore_auth:
              type: oauth2
              flows:
                authorizationCode:
                  authorizationUrl: https://example.com/authorize
                  tokenUrl: https://example.com/token
                  scopes:
                    read:pets: Read pets
                    write:pets: Write pets
      `,
      'foobar.yaml'
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
              "pointer": "#/paths/~1pets/get/security/0/petstore_auth/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "The "read:pet" scope is not defined in the "petstore_auth" security scheme.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [
            "read:pets",
          ],
        },
      ]
    `);
  });

  it('should not report when all scopes are defined across the scheme flows', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        security:
          - petstore_auth:
              - read:pets
              - admin
        paths: {}
        components:
          securitySchemes:
            petstore_auth:
              type: oauth2
              flows:
                implicit:
                  authorizationUrl: https://example.com/authorize
                  scopes:
                    read:pets: Read pets
                clientCredentials:
                  tokenUrl: https://example.com/token
                  scopes:
                    admin: Admin access
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'security-scopes-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on scopes of non-oauth2 or undefined security schemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        security:
          - api_key:
              - some:role
          - oidc:
              - openid
          - unknown_scheme:
              - read:pets
        paths: {}
        components:
          securitySchemes:
            api_key:
              type: apiKey
              in: header
              name: X-Api-Key
            oidc:
              type: openIdConnect
              openIdConnectUrl: https://example.com/.well-known/openid-configuration
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'security-scopes-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report oauth2 requirements without scopes when requireScopes is set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pets:
            get:
              security:
                - petstore_auth: []
        components:
          securitySchemes:
            petstore_auth:
              type: oauth2
              flows:
                implicit:
                  authorizationUrl: https://example.com/authorize
                  scopes:
                    read:pets: Read pets
      `,
      'foobar.yaml'
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
              "pointer": "#/paths/~1pets/get/security/0/petstore_auth",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The "petstore_auth" security requirement must list at least one scope.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

describe('Oas2 security-scopes-defined', () => {
  it('should report scopes that are not defined in the security scheme', async () => {
    const document = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        security:
          - petstore_auth:
              - read:pet
        paths: {}
        securityDefinitions:
          petstore_auth:
            type: oauth2
            flow: implicit
            authorizationUrl: https://example.com/authorize
            scopes:
              read:pets: Read pets
      `,
      'foobar.yaml'
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
              "pointer": "#/security/0/petstore_auth/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "The "read:pet" scope is not defined in the "petstore_auth" security scheme.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [
            "read:pets",
          ],
        },
      ]
    `);
  });
});

describe('Async2 security-scopes-defined', () => {
  it('should report scopes that are not defined in the security scheme flows', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Example API
          version: 1.0.0
        servers:
          production:
            url: broker.example.com
            protocol: kafka
            security:
              - broker_auth:
                  - write:events
        channels: {}
        components:
          securitySchemes:
            broker_auth:
              type: oauth2
              flows:
                clientCredentials:
                  tokenUrl: https://example.com/token
                  scopes:
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
              "pointer": "#/servers/production/security/0/broker_auth/0",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "The "write:events" scope is not defined in the "broker_auth" security scheme.",
          "reference": "https://redocly.com/docs/cli/rules/common/security-scopes-defined",
          "ruleId": "security-scopes-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
