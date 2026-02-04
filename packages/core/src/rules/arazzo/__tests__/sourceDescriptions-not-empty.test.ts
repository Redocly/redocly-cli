import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo sourceDescriptions-not-empty', () => {
  const document1 = parseYamlToDocument(
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
      arazzo: '1.0.1'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      sourceDescriptions: []
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

  it('should not report an error when sourceDescriptions have at least one entry.', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: document1,
      config: await createConfig({
        rules: { 'sourceDescriptions-not-empty': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report an error when sourceDescriptions is empty list.', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: document2,
      config: await createConfig({
        rules: { 'sourceDescriptions-not-empty': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/sourceDescriptions",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`sourceDescriptions\` list must have at least one entry.",
          "ruleId": "sourceDescriptions-not-empty",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
