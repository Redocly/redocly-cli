import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-outputs-invalid-map-name', () => {
  it('reports step and workflow output names that do not match the pattern', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
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
                successCriteria:
                  - condition: $statusCode == 201
                outputs:
                  order id: $response.body#/id
                  order.status_v2-raw: $response.body#/status
            outputs:
              order/id: $steps.create-order.outputs.order.status_v2-raw
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-outputs-invalid-map-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/order~1id",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The output name "order/id" does not match the regular expression "^[a-zA-Z0-9_.-]+$".",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-outputs-invalid-map-name",
          "ruleId": "spec-outputs-invalid-map-name",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/order id",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The output name "order id" does not match the regular expression "^[a-zA-Z0-9_.-]+$".",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-outputs-invalid-map-name",
          "ruleId": "spec-outputs-invalid-map-name",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports an Arazzo 1.1 output name that holds a Selector Object', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
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
                successCriteria:
                  - condition: $statusCode == 201
                outputs:
                  order id:
                    context: $response.body
                    selector: $.id
                    type: jsonpath
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-outputs-invalid-map-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/order id",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The output name "order id" does not match the regular expression "^[a-zA-Z0-9_.-]+$".",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-outputs-invalid-map-name",
          "ruleId": "spec-outputs-invalid-map-name",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report output names that match the pattern', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cafe workflows
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
                successCriteria:
                  - condition: $statusCode == 201
                outputs:
                  orderId: $response.body#/id
                  order.status_v2-raw: $response.body#/status
            outputs:
              orderId: $steps.create-order.outputs.orderId
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-outputs-invalid-map-name': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});
