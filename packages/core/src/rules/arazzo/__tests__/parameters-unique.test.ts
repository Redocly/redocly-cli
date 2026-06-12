import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo parameters-unique', () => {
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
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              parameters:
                - in: header
                  name: Secret
                  value: Basic Og==
                - in: header
                  name: Secret
                  value: Basic Og==
                - reference: $components.parameters.notify
                  value: 12
                - reference: $components.parameters.notify
                  value: 12
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should not report on `parameters` duplication', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: {} }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on `parameters` duplication', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'parameters-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/3",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`reference\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on duplicated `parameters` defined on success/failure actions', async () => {
    const actionDocument = parseYamlToDocument(
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
          - workflowId: outer
            steps:
              - stepId: step-1
                operationId: museum-api.getMuseumHours
                onSuccess:
                  - name: go-next
                    type: goto
                    workflowId: inner
                    parameters:
                      - name: token
                        value: a
                      - name: token
                        value: b
                onFailure:
                  - name: recover
                    type: goto
                    workflowId: inner
                    parameters:
                      - name: retryToken
                        value: a
                      - name: retryToken
                        value: b
          - workflowId: inner
            steps:
              - stepId: noop
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: actionDocument,
      config: await createConfig({
        rules: { 'parameters-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
