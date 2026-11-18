import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

const resourcesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../../resources'
);

describe('Arazzo spec-step-operationId-resolved', () => {
  it('reports the steps whose operationId does not resolve to an operation', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe-split/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: list-menu-items
                operationId: listMenuItems
              - stepId: create-order
                operationId: $sourceDescriptions.cafe-api.createOrder
              - stepId: get-order
                operationId: cafe-api.getOrderById
              - stepId: unknown-operation
                operationId: brewCoffee
              - stepId: unknown-operation-in-source
                operationId: $sourceDescriptions.cafe-api.brewCoffee
              - stepId: unknown-source
                operationId: $sourceDescriptions.bakery-api.listMenuItems
      `,
      path.join(resourcesDir, 'arazzo.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-step-operationId-resolved': 'error' } }),
    });

    expect(replaceSourceWithRef(results, resourcesDir)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/3/operationId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The operation \`brewCoffee\` is not defined in any of the source descriptions.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-operationid-resolved",
          "ruleId": "spec-step-operationId-resolved",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/4/operationId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The operation \`brewCoffee\` is not defined in the source description \`cafe-api\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-operationid-resolved",
          "ruleId": "spec-step-operationId-resolved",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/5/operationId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The source description \`bakery-api\` is not defined in \`sourceDescriptions\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-operationid-resolved",
          "ruleId": "spec-step-operationId-resolved",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report when the source description cannot be loaded', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: missing-cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: unknown-operation
                operationId: brewCoffee
      `,
      path.join(resourcesDir, 'arazzo.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-step-operationId-resolved': 'error' } }),
    });

    expect(results).toEqual([]);
  });

  it('does not load the source descriptions when the rule is off', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: cafe-split/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: list-menu-items
                operationId: listMenuItems
      `,
      path.join(resourcesDir, 'arazzo.yaml')
    );
    const externalRefResolver = new BaseResolver();

    await lintDocument({
      externalRefResolver,
      document,
      config: await createConfig({ rules: { 'spec-step-operationId-resolved': 'off' } }),
    });

    expect(externalRefResolver.getFiles()).toEqual(new Set());
  });
});
