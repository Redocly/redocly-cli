import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/load.js';

describe('Arazzo no-x-security-both-scheme-and-schemeName', () => {
  it('should report when both scheme and schemeName are provided at workflow level', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
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
                schemeName: MuseumPlaceholderAuth
                values:
                  token: some-token
            steps:
              - stepId: s1
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-x-security-both-scheme-and-scheme-name': 'error' },
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
          "message": "\`x-security\` item must not contain both \`scheme\` and \`schemeName\`.",
          "ruleId": "no-x-security-both-scheme-and-scheme-name",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when both scheme and schemeName are provided at step level', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: s1
                operationId: museum-api.getMuseumHours
                x-security:
                  - scheme:
                      type: http
                      scheme: bearer
                    schemeName: MuseumPlaceholderAuth
                    values:
                      token: some-token
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-x-security-both-scheme-and-scheme-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`x-security\` item must not contain both \`scheme\` and \`schemeName\`.",
          "ruleId": "no-x-security-both-scheme-and-scheme-name",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when only scheme is provided', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
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
                  token: some-token
            steps:
              - stepId: s1
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-x-security-both-scheme-and-scheme-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when only schemeName is provided', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - schemeName: MuseumPlaceholderAuth
                values:
                  token: some-token
            steps:
              - stepId: s1
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-x-security-both-scheme-and-scheme-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
