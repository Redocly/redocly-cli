import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-step-workflowId-defined', () => {
  it('reports steps whose workflowId does not reference an existing workflow', async () => {
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
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
          - workflowId: order-and-pay
            steps:
              - stepId: order
                workflowId: submit-order
              - stepId: pay
                workflowId: $sourceDescriptions.payments.pay-for-order
              - stepId: review
                workflowId: $sourceDescriptions.cafe-api.review-order
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-workflowId-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/0/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The workflow \`submit-order\` is not defined in \`workflows\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-workflowid-defined",
          "ruleId": "spec-step-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The source description \`payments\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-workflowid-defined",
          "ruleId": "spec-step-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/2/workflowId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The source description \`cafe-api\` must have the \`arazzo\` type to contain workflows.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-workflowid-defined",
          "ruleId": "spec-step-workflowId-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report steps that reference a workflow of the document or of an Arazzo source description', async () => {
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
          - workflowId: order-and-pay
            steps:
              - stepId: order
                workflowId: place-order
              - stepId: pay
                workflowId: $sourceDescriptions.payments.pay-for-order
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-workflowId-defined': 'error' },
      }),
    });

    expect(results).toEqual([]);
  });
});
