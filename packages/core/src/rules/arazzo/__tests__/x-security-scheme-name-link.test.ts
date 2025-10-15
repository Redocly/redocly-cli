import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/load.js';

describe('Arazzo x-security-scheme-name-link', () => {
  it('should report when multiple sourceDescriptions exist and schemeName is a plain string', async () => {
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
          - name: pets-api
            type: openapi
            url: pets.yaml
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
        rules: { 'x-security-scheme-name-link': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/x-security/0/schemeName",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "When multiple \`sourceDescriptions\` exist, \`workflow.x-security.schemeName\` must be a link to a source description (e.g. \`$sourceDescriptions.{name}.{scheme}\`)",
          "ruleId": "x-security-scheme-name-link",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when multiple sourceDescriptions exist and schemeName is a valid link', async () => {
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
          - name: pets-api
            type: openapi
            url: pets.yaml
        workflows:
          - workflowId: get-museum-hours
            x-security:
              - schemeName: $sourceDescriptions.museum-api.MuseumPlaceholderAuth
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
        rules: { 'x-security-scheme-name-link': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when only one sourceDescription exists and schemeName is a plain string', async () => {
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
        rules: { 'x-security-scheme-name-link': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
