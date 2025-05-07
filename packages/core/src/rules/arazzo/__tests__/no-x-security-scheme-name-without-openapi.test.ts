import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import {
  parseYamlToDocument,
  replaceSourceWithRef,
  makeConfig,
} from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo no-x-security-scheme-name-without-openapi', () => {
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
                    token: some-token
              successCriteria:
                - condition: $statusCode == 200
            - stepId: step-without-openapi-operation-and-security-scheme-name
              x-operation:
                method: GET
                url: https://api.example.com/v1/users
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
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should report when the `schemeName` is used in `x-security` in a step without OpenAPI operation', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'no-x-security-scheme-name-without-openapi': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/x-security/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`schemeName\` can be only used in Step with OpenAPI operation, please use \`scheme\` instead.",
          "ruleId": "no-x-security-scheme-name-without-openapi",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
