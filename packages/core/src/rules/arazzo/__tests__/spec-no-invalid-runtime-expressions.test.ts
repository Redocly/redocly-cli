import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-no-invalid-runtime-expressions', () => {
  it('reports the values that do not follow the Arazzo 1.0 runtime expression syntax', async () => {
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
              - stepId: list-menu
                operationPath: '{$sourceDescription.cafe-api.url}#/paths/~1menu/get'
              - stepId: create-order
                operationId: cafe-api.createOrder
                parameters:
                  - reference: $component.parameters.page
                successCriteria:
                  - context: $response
                    condition: ^2
                    type: regex
                outputs:
                  orderId: $resposne.body#/id
                  status: $response.body.status
                  authorization: Bearer {$resposne.body#/token}
                  customerId: '{ $resposne.body#/customerId }'
            outputs:
              orderId: $message.payload#/id
              total: $steps.create-order.total
              orderSchema: $components.schemas.Order
        components:
          parameters:
            page:
              name: page
              in: query
              value: 1
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-no-invalid-runtime-expressions': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/orderId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$message.payload#/id\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/operationPath",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$sourceDescription.cafe-api.url\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/parameters/0/reference",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$component.parameters.page\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/successCriteria/0/context",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$response\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/outputs/orderId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$resposne.body#/id\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/outputs/status",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$response.body.status\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/outputs/authorization",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$resposne.body#/token\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/outputs/customerId",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$resposne.body#/customerId\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports the values that do not follow the Arazzo 1.1 runtime expression syntax', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: account-events
            type: asyncapi
            url: asyncapi.yaml
        workflows:
          - workflowId: welcome-customer
            steps:
              - stepId: receive-signup
                operationId: account-events.receiveUserSignedUp
                action: receive
                parameters:
                  - name: channel
                    value:
                      context: $inputs
                      selector: $.channel
                      type: jsonpath
                outputs:
                  email: $message.payload#/email
                  customerName: $message.payload.customerName
                  account:
                    context: $message
                    selector: $.account
                    type: jsonpath
            outputs:
              description: $self
              email: $steps.receive-signup.outputs.email
              total: $steps.receive-signup.total
              orderSchema: $components.schemas.Order
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-no-invalid-runtime-expressions': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/total",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$steps.receive-signup.total\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/orderSchema",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$components.schemas.Order\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/0/value/context",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$inputs\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/customerName",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$message.payload.customerName\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/account/context",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "\`$message\` is not a valid runtime expression.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions",
          "ruleId": "spec-no-invalid-runtime-expressions",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it.each(['1.0.1', '1.1.0'])(
    'does not report valid runtime expressions and parameter values in Arazzo %s',
    async (version) => {
      const document = parseYamlToDocument(
        outdent`
        arazzo: '${version}'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: place-order
            inputs:
              type: object
              properties:
                customerName:
                  type: string
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                parameters:
                  - reference: $components.parameters.page
                  - name: coupon
                    in: query
                    value: $5-off
                successCriteria:
                  - condition: $statusCode == 201
                  - context: $response.body
                    condition: $.id
                    type: jsonpath
                outputs:
                  orderId: $response.body#/id
                  firstItemId: $response.body#/orderItems/0/menuItemId
                  requestId: $response.header.X-Request-Id
                  customerName: $inputs.customerName
                  customerEmail: $inputs.customer#/email
                  couponCode: $inputs._coupon
                  method: $method
                  kind: beverage
                  authorization: Bearer {$response.body#/token}
                  customerId: '{ $response.body#/customerId }'
                  correlationId: $faker.string.uuid()
                  orderLabel: order-{$faker.string.uuid()}
                  nextPage: $response.body#/@odata.nextLink
                  members: $response.body#/hydra:member
                  filter: $request.query.$filter
                  userId: $request.path.user.id
              - stepId: get-order
                operationPath: '{$sourceDescriptions.cafe-api.url}#/paths/~1orders~1{orderId}/get'
            outputs:
              orderId: $steps.create-order.outputs.orderId
              orderValue: $steps.create-order.outputs.order.id#/value
              customerName: $workflows.place-order.inputs.customer#/name
              apiUrl: $sourceDescriptions.cafe-api.url
        components:
          parameters:
            page:
              name: page
              in: query
              value: 1
      `,
        'arazzo.yaml'
      );

      const results = await lintDocument({
        externalRefResolver: new BaseResolver(),
        document,
        config: await createConfig({
          rules: { 'spec-no-invalid-runtime-expressions': 'error' },
        }),
      });

      expect(results).toEqual([]);
    }
  );
});
