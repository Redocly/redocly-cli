import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-action-workflowId-defined', () => {
  it('reports actions whose workflowId does not reference an existing workflow', async () => {
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
          - name: payments
            type: arazzo
            url: payments.arazzo.yaml
        workflows:
          - workflowId: place-order
            successActions:
              - name: continue-to-payment
                type: goto
                workflowId: pay-for-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                onSuccess:
                  - name: review-order
                    type: goto
                    workflowId: $sourceDescriptions.cafe-api.review-order
                onFailure:
                  - name: refund-order
                    type: goto
                    workflowId: $sourceDescriptions.payments
                  # The spec-sourceDescriptions-defined rule reports a source description that is not defined.
                  - name: notify-kitchen
                    type: goto
                    workflowId: $sourceDescriptions.kitchen.notify
        components:
          failureActions:
            retry-after-refresh:
              name: retry-after-refresh
              type: retry
              workflowId: refresh-menu
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-action-workflowId-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The source description \`cafe-api\` must have the \`arazzo\` type to contain workflows.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined",
          "ruleId": "spec-action-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The reference \`$sourceDescriptions.payments\` must have the form \`$sourceDescriptions.<name>.<workflowId>\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined",
          "ruleId": "spec-action-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/successActions/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The workflow \`pay-for-order\` is not defined in \`workflows\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined",
          "ruleId": "spec-action-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/failureActions/retry-after-refresh/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The workflow \`refresh-menu\` is not defined in \`workflows\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined",
          "ruleId": "spec-action-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report actions that reference a workflow of the document or of an Arazzo source description', async () => {
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
          - name: payments
            type: arazzo
            url: payments.arazzo.yaml
          - name: loyalty
            url: loyalty.arazzo.yaml
        workflows:
          - workflowId: place-order
            successActions:
              - name: continue-to-payment
                type: goto
                workflowId: $sourceDescriptions.payments.pay-for-order
              # The sourceDescription-type rule reports a source description without a type.
              - name: add-loyalty-points
                type: goto
                workflowId: $sourceDescriptions.loyalty.add-points
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                onSuccess:
                  # The workflowId of an end action is not relevant.
                  - name: finish
                    type: end
                    workflowId: review-order
                onFailure:
                  - reference: $components.failureActions.retry-after-refresh
          - workflowId: refresh-menu
            steps:
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
        components:
          failureActions:
            retry-after-refresh:
              name: retry-after-refresh
              type: retry
              workflowId: refresh-menu
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-action-workflowId-defined': 'error' },
      }),
    });

    expect(results).toEqual([]);
  });
});
