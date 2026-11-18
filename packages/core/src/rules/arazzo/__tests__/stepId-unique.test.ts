import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo stepId-unique', () => {
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
        - workflowId: get-museum-hours-2
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
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should report when the `stepId` is not unique amongst all steps described in the workflow', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'stepId-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` must be unique amongst all steps described in the workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/stepid-unique",
          "ruleId": "stepId-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the `stepId` is not unique amongst all steps described in the workflow', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {},
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should leave a malformed `steps` list to the struct rule', async () => {
    const documentWithMalformedSteps = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Redocly Cafe ordering workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe.yaml
        workflows:
          - workflowId: list-menu
            steps: {}
          - workflowId: place-order
            steps:
              - null
          - workflowId: get-order
            steps:
              - stepId: get-order
                operationId: getOrderById
              - stepId: get-order
                operationId: getOrderById
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: documentWithMalformedSteps,
      config: await createConfig({
        rules: { struct: 'error', 'stepId-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/workflows/0/steps",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Expected type \`Steps\` (array) but got \`object\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/workflows/1/steps/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Expected type \`Step\` (object) but got \`null\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/2/steps/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` must be unique amongst all steps described in the workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/stepid-unique",
          "ruleId": "stepId-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
