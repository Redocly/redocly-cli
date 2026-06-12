import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../__tests__/utils.js';
import { createConfig } from '../config/index.js';
import { lintDocument } from '../lint.js';
import { BaseResolver } from '../resolve.js';

describe('Arazzo 1.1 lint', () => {
  it('lints a document using every new 1.1 feature without struct errors', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        $self: https://example.com/workflows/museum.arazzo.yaml
        info:
          title: Museum workflows
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
          - name: museum-events
            type: asyncapi
            url: asyncapi.yaml
        workflows:
          - workflowId: events
            steps:
              - stepId: create-event
                operationId: museum-api.createEvent
                parameters:
                  - in: querystring
                    name: raw
                    value: 'filter=upcoming&limit=5'
                requestBody:
                  payload:
                    name: Mermaid Treasure
                  replacements:
                    - target: $.name
                      targetSelectorType: jsonpath
                      value: Updated name
                successCriteria:
                  - context: $response.body
                    condition: $[?(@.name == 'Updated name')]
                    type:
                      type: jsonpath
                      version: rfc9535
                outputs:
                  eventId:
                    context: $response.body
                    selector: $.eventId
                    type: jsonpath
                onSuccess:
                  - name: notify
                    type: goto
                    workflowId: notify
                    parameters:
                      - name: eventName
                        value: Mermaid Treasure
              - stepId: await-confirmation
                channelPath: $sourceDescriptions.museum-events#/channels/eventCreated
                action: receive
                correlationId: $message.payload#/eventId
                timeout: 5000
                dependsOn:
                  - create-event
                successCriteria:
                  - condition: $statusCode == 200
          - workflowId: notify
            inputs:
              type: object
              properties:
                eventName:
                  type: string
            steps:
              - stepId: send-notification
                operationId: museum-api.notify
                successCriteria:
                  - condition: $statusCode == 202
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
        $self: https://example.com/workflows/museum.arazzo.yaml
        info:
          title: Museum workflows
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: events
            steps:
              - stepId: create-event
                operationId: museum-api.createEvent
                action: send
                successCriteria:
                  - condition: $statusCode == 200
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
          title: Museum workflows
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: events
            steps:
              - stepId: create-event
                operationId: museum-api.createEvent
                successCriteria:
                  - condition: $statusCode == 200
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
          title: Museum workflows
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: events
            steps:
              - stepId: create-event
                operationId: museum-api.createEvent
                action: deliver
                successCriteria:
                  - context: $response.body
                    condition: $.name
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
});
