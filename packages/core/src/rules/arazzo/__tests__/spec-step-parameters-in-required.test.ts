import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-step-parameters-in-required', () => {
  it('reports parameters without `in` that reach a step without workflowId', async () => {
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
          - workflowId: get-order
            parameters:
              - name: limit
                value: 10
              - reference: $components.parameters.orderId
            steps:
              - stepId: get-order
                operationId: cafe-api.getOrderById
                parameters:
                  - name: orderId
                    value: $inputs.orderId
                  - name: Accept
                    in: header
                    value: application/json
              - stepId: list-order-items
                operationPath: '{$sourceDescriptions.cafe-api.url}#/paths/~1orders~1{orderId}~1items/get'
                parameters:
                  - reference: $components.parameters.orderId
              - stepId: list-menu-items
                x-operation:
                  url: https://cafe.example.com/menu
                  method: get
                parameters:
                  - name: limit
                    value: 10
              - stepId: pay-for-order
                workflowId: pay-for-order
        components:
          parameters:
            orderId:
              name: orderId
              value: $inputs.orderId
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-parameters-in-required': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A workflow parameter must define the \`in\` field, unless all steps of the workflow use \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required",
          "ruleId": "spec-step-parameters-in-required",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A workflow parameter must define the \`in\` field, unless all steps of the workflow use \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required",
          "ruleId": "spec-step-parameters-in-required",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A step parameter must define the \`in\` field, unless the step uses \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required",
          "ruleId": "spec-step-parameters-in-required",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A step parameter must define the \`in\` field, unless the step uses \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required",
          "ruleId": "spec-step-parameters-in-required",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/2/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "A step parameter must define the \`in\` field, unless the step uses \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required",
          "ruleId": "spec-step-parameters-in-required",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report parameters with `in` or parameters that only reach workflowId steps', async () => {
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
          - workflowId: get-order
            parameters:
              - name: limit
                in: query
                value: 10
            steps:
              - stepId: get-order
                operationId: cafe-api.getOrderById
                parameters:
                  - name: orderId
                    in: path
                    value: $inputs.orderId
                  - reference: $components.parameters.accept
              - stepId: pay-for-order
                workflowId: pay-for-order
                parameters:
                  - name: orderId
                    value: $inputs.orderId
                  - reference: $components.parameters.amount
          - workflowId: pay-for-order
            steps:
              - stepId: list-orders
                operationId: cafe-api.listOrders
          - workflowId: order-and-pay
            parameters:
              - name: orderId
                value: $inputs.orderId
            steps:
              - stepId: get-order
                workflowId: get-order
              - stepId: pay-for-order
                workflowId: pay-for-order
        components:
          parameters:
            accept:
              name: Accept
              in: header
              value: application/json
            amount:
              name: amount
              value: 10
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-parameters-in-required': 'error' },
      }),
    });

    expect(results).toEqual([]);
  });
});
