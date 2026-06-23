import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../__tests__/utils.js';
import { createConfig } from '../config/index.js';
import { lintDocument } from '../lint.js';
import { BaseResolver } from '../resolve.js';

describe('Arazzo 1.1 lint', () => {
  it('lints a document using the new 1.1 constructs without struct errors', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        $self: https://cafe.cloud.redocly.com/workflows/cafe.arazzo.yaml
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
          - name: account-events
            type: asyncapi
            url: ../../../../resources/asyncapi3.yaml
        workflows:
          - workflowId: place-order
            inputs:
              type: object
              properties:
                customerName:
                  type: string
            steps:
              - stepId: find-beverage
                operationId: cafe-api.listMenuItems
                parameters:
                  - in: querystring
                    name: query
                    value: 'filter=category:beverage&limit=5'
                successCriteria:
                  - context: $response.body
                    condition: $.items[?(@.category == 'beverage')]
                    type:
                      type: jsonpath
                      version: rfc9535
                outputs:
                  beverageId:
                    context: $response.body
                    selector: $.items[0].id
                    type: jsonpath
              - stepId: create-order
                operationId: cafe-api.createOrder
                dependsOn:
                  - find-beverage
                requestBody:
                  payload:
                    customerName: ''
                    orderItems:
                      - menuItemId: ''
                        quantity: 1
                  replacements:
                    - target: /orderItems/0/menuItemId
                      targetSelectorType: jsonpointer
                      value: $steps.find-beverage.outputs.beverageId
                    - target: $.customerName
                      targetSelectorType:
                        type: jsonpath
                        version: rfc9535
                      value:
                        context: $inputs
                        selector: $.customerName
                        type: jsonpath
                successCriteria:
                  - condition: $statusCode == 201
                outputs:
                  orderId: $response.body#/id
                onSuccess:
                  - name: notify-customer
                    type: goto
                    workflowId: notify-customer
                    parameters:
                      - name: orderId
                        value: $steps.create-order.outputs.orderId
          - workflowId: notify-customer
            inputs:
              type: object
              properties:
                orderId:
                  type: string
            steps:
              - stepId: load-order
                operationId: cafe-api.getOrderById
                parameters:
                  - in: path
                    name: orderId
                    value: $inputs.orderId
                successCriteria:
                  - condition: $statusCode == 200
          - workflowId: await-user-signup
            inputs:
              type: object
              properties:
                email:
                  type: string
            steps:
              - stepId: await-signup
                channelPath: $sourceDescriptions.account-events#/channels/userSignedup
                action: receive
                correlationId: $inputs.email
                timeout: 5000
                successCriteria:
                  - condition: $statusCode == 200
                outputs:
                  email:
                    context: $message.payload
                    selector: /email
                    type:
                      type: jsonpointer
                      version: rfc6901
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('accepts an xpath Expression Type Object in a criterion', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
        workflows:
          - workflowId: get-order-feed
            steps:
              - stepId: read-feed
                operationId: cafe-api.getOrderById
                successCriteria:
                  - context: $response.body
                    condition: '/order/status'
                    type:
                      type: xpath
                      version: xpath-31
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('reports 1.1-only fields as unknown in a 1.0.1 document', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        $self: https://cafe.cloud.redocly.com/workflows/cafe.arazzo.yaml
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                action: send
                successCriteria:
                  - condition: $statusCode == 201
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    const messages = results.map((r) => r.message);
    expect(messages).toContain(`Property \`$self\` is not expected here.`);
    expect(messages).toContain(`Property \`action\` is not expected here.`);
  });

  it('applies plugin typeExtension to arazzo1_1 documents without crashing', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                successCriteria:
                  - condition: $statusCode == 201
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test-arazzo1_1-type-extension',
            typeExtension: {
              arazzo1: (types) => types,
            },
          },
        ],
        rules: { struct: 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('reports invalid enum values for 1.1 fields', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                action: deliver
                successCriteria:
                  - context: $response.body
                    condition: $.id
                    type:
                      type: jsonpath
                      version: xpath-30
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    const messages = results.map((r) => r.message);
    expect(messages).toContain('`action` can be one of the following only: "send", "receive".');
    expect(messages).toContain(
      '`version` can be one of the following only: "rfc9535", "draft-goessner-dispatch-jsonpath-00".'
    );
  });

  it('reports an unknown Expression Type Object type instead of assuming xpath', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cafe workflows
          version: 1.0.0
        sourceDescriptions:
          - name: cafe-api
            type: openapi
            url: ../../../../resources/cafe.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: create-order
                operationId: cafe-api.createOrder
                successCriteria:
                  - context: $response.body
                    condition: $.id
                    type:
                      type: jspath
                      version: rfc9535
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    const messages = results.map((r) => r.message);
    expect(messages).toContain(
      '`type` can be one of the following only: "jsonpath", "xpath", "jsonpointer".'
    );
  });
});
