import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import {
  parseYamlToDocument,
  replaceSourceWithRef,
  makeConfig,
} from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo no-x-security-scheme-name-in-workflow', () => {
  it('should report when the `schemeName` is used in `x-security` in a workflow', async () => {
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
              - schemeName: MuseumPlaceholderAuth
                values:
                  email: todd@example.com
                  password: 123456
              - scheme:
                  type: apiKey
                  name: api-key
                  in: header
                values:
                  token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                successCriteria:
                  - condition: $statusCode == 200
              - stepId: step-without-openapi-operation-and-security-scheme-name
                x-operation:
                  method: GET
                  url: https://api.example.com/v1/users
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'no-x-security-scheme-name-in-workflow': 'error' },
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
          "message": "The \`schemeName\` can't be used in Workflow, please use \`scheme\` instead.",
          "ruleId": "no-x-security-scheme-name-in-workflow",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the `scheme` is used in `x-security` in a workflow', async () => {
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
                  token: some-token
            steps:
              - stepId: step-with-openapi-operation
                operationId: museum-api.getMuseumHours
                successCriteria:
                  - condition: $statusCode == 200
              - stepId: step-without-openapi-operation-and-security-scheme-name
                x-operation:
                  method: GET
                  url: https://api.example.com/v1/users
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'no-x-security-scheme-name-in-workflow': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
