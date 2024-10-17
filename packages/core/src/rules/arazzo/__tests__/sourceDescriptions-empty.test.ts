import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo sourceDescriptions-empty', () => {
  const document1 = parseYamlToDocument(
    outdent`
      arazzo: '1.0.0'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      sourceDescriptions:
        - name: museum-api
          type: openapi
          url: openapi.yaml
        - name: museum-api
          type: openapi
          url: openapi.yaml
      workflows:
        - workflowId: get-museum-hours
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  const document2 = parseYamlToDocument(
    outdent`
      arazzo: '1.0.0'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      workflows:
        - workflowId: get-museum-hours
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  const document3 = parseYamlToDocument(
    outdent`
      arazzo: '1.0.0'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      workflows:
        - workflowId: get-museum-hours
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              x-operation:
                url: https://example.com
                method: GET
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should not report an error when sourceDescriptions described and operationId or operationPath is used.', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: document1,
      config: await makeConfig({
        rules: {},
        arazzoRules: { 'sourceDescriptions-empty': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report an error when sourceDescriptions are not described and operationId or operationPath is used.', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: document2,
      config: await makeConfig({
        rules: {},
        arazzoRules: { 'sourceDescriptions-empty': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/operationId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`sourceDescriptions\` must be defined when \`operationId\` description reference is used.",
          "ruleId": "sourceDescriptions-empty",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report an error when sourceDescriptions are not described and x-operation is used.', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: document3,
      config: await makeConfig({
        rules: {},
        arazzoRules: { 'sourceDescriptions-empty': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
