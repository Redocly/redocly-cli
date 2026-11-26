import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-step-dependsOn-defined', () => {
  it('should report a dependsOn value that does not reference a defined step', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
          - name: loyalty
            type: arazzo
            url: loyalty.arazzo.yaml
        workflows:
          - workflowId: browse-menu
            steps:
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
              - stepId: get-order
                operationId: cafe-api.getOrderById
                dependsOn:
                  - submit-order
                  - list-menu-items
                  - $workflows.checkout.steps.create-order
                  - $workflows.browse-menu.steps.create-order
                  - $steps.create-order
                  - $sourceDescriptions.loyalty.earn-points
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1_1Rules: { 'spec-step-dependsOn-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The step \`submit-order\` is not defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The step \`list-menu-items\` is not defined in the current workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/2",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The workflow \`checkout\` is not defined in \`workflows\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/3",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The step \`create-order\` is not defined in the workflow \`browse-menu\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/4",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The value \`$steps.create-order\` must be a \`stepId\` of the current workflow, or have the form \`$workflows.<workflowId>.steps.<stepId>\` or \`$sourceDescriptions.<name>.<workflowId>.steps.<stepId>\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/1/steps/1/dependsOn/5",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The value \`$sourceDescriptions.loyalty.earn-points\` must be a \`stepId\` of the current workflow, or have the form \`$workflows.<workflowId>.steps.<stepId>\` or \`$sourceDescriptions.<name>.<workflowId>.steps.<stepId>\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report a step of the current workflow, of another workflow, or of another Arazzo document', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
          - name: loyalty
            type: arazzo
            url: loyalty.arazzo.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: get-order
                operationId: cafe-api.getOrderById
                dependsOn:
                  - create-order
                  - $workflows.browse-menu.steps.list-menu-items
                  - $workflows.browse-menu.steps.list.items
                  - $workflows.menu.photos.steps.get-photo
                  - $sourceDescriptions.loyalty.earn-points.steps.add-points
              - stepId: create-order
                operationId: cafe-api.createOrder
          - workflowId: browse-menu
            steps:
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
              - stepId: list.items
                operationId: cafe-api.listMenuItems
          - workflowId: menu.photos
            steps:
              - stepId: get-photo
                operationId: cafe-api.getMenuItemPhoto
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1_1Rules: { 'spec-step-dependsOn-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should skip a `null` item of workflows, of steps, and of dependsOn', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - null
          - workflowId: browse-menu
            steps: null
          - workflowId: place-order
            steps:
              - null
              - stepId: create-order
                operationId: cafe-api.createOrder
                dependsOn:
                  - null
                  - $workflows.browse-menu.steps.list-menu-items
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1_1Rules: { 'spec-step-dependsOn-defined': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/2/steps/1/dependsOn/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The step \`list-menu-items\` is not defined in the workflow \`browse-menu\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined",
          "ruleId": "spec-step-dependsOn-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
