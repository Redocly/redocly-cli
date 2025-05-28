import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import {
  parseYamlToDocument,
  replaceSourceWithRef,
  makeConfig,
} from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo x-security-scheme-required-values', () => {
  it('should report when required values are missing for Basic Auth x-security schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: http
                  scheme: basic
                values:
                  token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - schemeName: MuseumPlaceholderAuth
                    values:
                      email: todd@example.com
                      password: 123456
                  - scheme:
                      type: http
                      scheme: basic
                    values:
                      token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`username\` is required when using the basic authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`password\` is required when using the basic authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`username\` is required when using the basic authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`password\` is required when using the basic authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when required values are missing for Bearer Auth x-security schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: http
                  scheme: bearer
                values:
                  some-token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - schemeName: MuseumPlaceholderAuth
                    values:
                      email: todd@example.com
                      password: 123456
                  - scheme:
                      type: http
                      scheme: bearer
                    values:
                      some-token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`token\` is required when using the bearer authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`token\` is required when using the bearer authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when required values are missing for API-Key Auth x-security schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: apiKey
                  name: api-key
                  in: header
                values:
                  some-token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - schemeName: MuseumPlaceholderAuth
                    values:
                      email: todd@example.com
                      password: 123456
                  - scheme:
                      type: apiKey
                      name: api-key
                      in: header
                    values:
                      some-token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`apiKey\` is required when using the apiKey authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`apiKey\` is required when using the apiKey authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when required values are missing for OAuth2 Auth x-security schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: oauth2
                  flows:
                    implicit:
                      authorizationUrl: https://example.org/api/oauth/dialog
                      scopes:
                        write:pets: modify pets in your account
                        read:pets: read your pets
                    values:
                      some-token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - schemeName: MuseumPlaceholderAuth
                    values:
                      email: todd@example.com
                      password: 123456
                  - scheme:
                      type: oauth2
                      flows:
                        implicit:
                          authorizationUrl: https://example.org/api/oauth/dialog
                          scopes:
                            write:pets: modify pets in your account
                            read:pets: read your pets
                    values:
                      some-token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`accessToken\` is required when using the oauth2 authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`accessToken\` is required when using the oauth2 authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when required values are missing for Digest Auth x-security schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: http
                  scheme: digest
                values:
                  token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - schemeName: MuseumPlaceholderAuth
                    values:
                      email: todd@example.com
                      password: 123456
                  - scheme:
                      type: http
                      scheme: digest
                    values:
                      token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`username\` is required when using the digest authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`password\` is required when using the digest authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`username\` is required when using the digest authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`password\` is required when using the digest authentication security schema.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when unsupported auth type is used', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - scheme:
                  type: http
                  scheme: PrivateToken
                values:
                  some-token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                x-security:
                  - scheme:
                      type: http
                      scheme: PrivateToken
                    values:
                      some-token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'x-security-scheme-required-values': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`PrivateToken\` authentication security schema is not supported.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`PrivateToken\` authentication security schema is not supported.",
          "ruleId": "x-security-scheme-required-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
