import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-action-stepId-defined', () => {
  it('should report an action with a stepId that is not a step of the current workflow', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.0.1
        info:
          title: Redocly Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: place-order
            failureActions:
              - name: start-over
                type: goto
                stepId: list-menu
            steps:
              - stepId: list-menu-items
                operationId: listMenuItems
                onFailure:
                  - name: retry-after-orders
                    type: retry
                    stepId: list-orders
              - stepId: create-order
                operationId: createOrder
                onSuccess:
                  - name: check-order
                    type: goto
                    stepId: get-order
                  - reference: $components.successActions.check-order
          - workflowId: track-order
            steps:
              - stepId: get-order
                operationId: getOrderById
                onSuccess:
                  - reference: $components.successActions.check-order
        components:
          successActions:
            check-order:
              name: check-order
              type: goto
              stepId: get-order
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-action-stepId-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/stepId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` "list-orders" must reference a step defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined",
          "ruleId": "spec-action-stepId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/onSuccess/0/stepId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` "get-order" must reference a step defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined",
          "ruleId": "spec-action-stepId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/onSuccess/1/reference",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` "get-order" must reference a step defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined",
          "ruleId": "spec-action-stepId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/failureActions/0/stepId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`stepId\` "list-menu" must reference a step defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined",
          "ruleId": "spec-action-stepId-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report actions that reference a step of the current workflow', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.1.0
        info:
          title: Redocly Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: place-order
            failureActions:
              - name: start-over
                type: goto
                stepId: list-menu-items
            steps:
              - stepId: list-menu-items
                operationId: listMenuItems
                onFailure:
                  - name: retry-after-order
                    type: retry
                    stepId: create-order
              - stepId: create-order
                operationId: createOrder
                onSuccess:
                  - reference: $components.successActions.back-to-menu
                  - name: track-order
                    type: goto
                    workflowId: track-order
                  - name: finish
                    type: end
                    stepId: get-order
          - workflowId: track-order
            steps:
              - stepId: get-order
                operationId: getOrderById
        components:
          successActions:
            back-to-menu:
              name: back-to-menu
              type: goto
              stepId: list-menu-items
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-action-stepId-defined': 'error' } }),
    });

    expect(results).toEqual([]);
  });
});
