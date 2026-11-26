import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo no-step-requestBody-with-workflowId', () => {
  it('reports the requestBody of a step that uses workflowId', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: create-order
            inputs:
              type: object
              properties:
                customerName:
                  type: string
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                requestBody:
                  payload:
                    customerName: $inputs.customerName
          - workflowId: order-for-ada
            steps:
              - stepId: create-order
                workflowId: create-order
                requestBody:
                  payload:
                    customerName: Ada
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-step-requestBody-with-workflowId': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/0/requestBody",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A step that uses \`workflowId\` must not define \`requestBody\`. Use \`parameters\` to pass inputs to the workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/no-step-requestbody-with-workflowid",
          "ruleId": "no-step-requestBody-with-workflowId",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report a step that passes parameters to a workflow', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: create-order
            inputs:
              type: object
              properties:
                customerName:
                  type: string
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                requestBody:
                  payload:
                    customerName: $inputs.customerName
          - workflowId: order-for-ada
            steps:
              - stepId: create-order
                workflowId: create-order
                parameters:
                  - name: customerName
                    value: Ada
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-step-requestBody-with-workflowId': 'error' },
      }),
    });

    expect(results).toEqual([]);
  });
});
