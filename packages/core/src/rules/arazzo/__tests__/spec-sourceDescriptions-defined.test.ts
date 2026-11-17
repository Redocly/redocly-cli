import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-sourceDescriptions-defined', () => {
  it('reports the references to a source description that is not defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: list-menu-items
                operationId: $sourceDescriptions.bakery-api.listMenuItems
              - stepId: create-order
                operationPath: '{$sourceDescriptions.bakery-api.url}#/paths/~1orders/post'
              - stepId: track-order
                workflowId: $sourceDescriptions.delivery-workflows.track-order
                onSuccess:
                  - name: send-receipt
                    type: goto
                    workflowId: $sourceDescriptions.billing-workflows.send-receipt
                onFailure:
                  - name: refund-order
                    type: goto
                    workflowId: $sourceDescriptions.billing-workflows.refund-order
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-sourceDescriptions-defined': 'error' },
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
          "message": "Source description \`bakery-api\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/operationPath",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`bakery-api\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/2/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`delivery-workflows\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/2/onSuccess/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`billing-workflows\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/2/onFailure/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`billing-workflows\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports the references added in Arazzo 1.1', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: wait-for-order
                channelPath: '{$sourceDescriptions.order-events.url}#/channels/orderReady'
                action: receive
                dependsOn:
                  - $sourceDescriptions.kitchen-workflows.prepare-order.steps.cook
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-sourceDescriptions-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/channelPath",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`order-events\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/dependsOn/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Source description \`kitchen-workflows\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined",
          "ruleId": "spec-sourceDescriptions-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report the references to defined source descriptions', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe.yaml
          - name: delivery-workflows
            type: arazzo
            url: delivery.arazzo.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: list-menu-items
                operationId: $sourceDescriptions.cafe-api.listMenuItems
              - stepId: create-order
                operationPath: '{$sourceDescriptions.cafe-api.url}#/paths/~1orders/post'
              - stepId: get-order
                operationId: getOrderById
              - stepId: track-order
                workflowId: $sourceDescriptions.delivery-workflows.track-order
                onFailure:
                  - name: retry-delivery
                    type: goto
                    workflowId: $sourceDescriptions.delivery-workflows.retry-delivery
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-sourceDescriptions-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});
