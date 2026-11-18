import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-action-mutually-exclusive-fields', () => {
  it('reports success and failure actions that use stepId and workflowId together', async () => {
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
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
                onSuccess:
                  - name: continue-to-order
                    type: goto
                    stepId: create-order
                    workflowId: place-order
              - stepId: create-order
                operationId: cafe-api.createOrder
        components:
          failureActions:
            retry-after-refresh:
              name: retry-after-refresh
              type: retry
              stepId: list-menu-items
              workflowId: place-order
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-action-mutually-exclusive-fields': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/stepId",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/workflowId",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "An action can only use one of the following mutually exclusive fields: \`stepId\`, \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-mutually-exclusive-fields",
          "ruleId": "spec-action-mutually-exclusive-fields",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/failureActions/retry-after-refresh/stepId",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
            {
              "pointer": "#/components/failureActions/retry-after-refresh/workflowId",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "An action can only use one of the following mutually exclusive fields: \`stepId\`, \`workflowId\`.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-action-mutually-exclusive-fields",
          "ruleId": "spec-action-mutually-exclusive-fields",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report actions that use a single target', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
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
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
                onSuccess:
                  - name: continue-to-order
                    type: goto
                    stepId: create-order
                onFailure:
                  - name: refresh-menu
                    type: retry
                    workflowId: refresh-menu
                  - name: stop
                    type: end
              - stepId: create-order
                operationId: cafe-api.createOrder
          - workflowId: refresh-menu
            steps:
              - stepId: list-menu-items
                operationId: cafe-api.listMenuItems
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-action-mutually-exclusive-fields': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});
