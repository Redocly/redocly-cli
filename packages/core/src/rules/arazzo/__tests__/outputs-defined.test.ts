import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo outputs-defined', () => {
  it('should report on undefined outputs in parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                parameters:
                  - in: header
                    name: Secret
                    value: Basic Og==
                  - in: header
                    name: Something
                    value: $steps.get-museum-hours.outputs.not-defined-output-used-in-parameters
                  - reference: $components.parameters.notify
                    value: $workflows.get-museum-hours.outputs.not-defined-output-used-in-parameters
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/1/value",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.not-defined-output-used-in-parameters" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/2/value",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Workflow "get-museum-hours" referenced in runtime expression "$workflows.get-museum-hours.outputs.not-defined-output-used-in-parameters" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in requestBody', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.postMuseumHours
                requestBody:
                  contentType: application/json
                  payload:
                    name: 'Mermaid Treasure Identification and Analysis'
                    broken: $steps.buy-ticket.outputs.broken-in-payload
                    listItems:
                      - $steps.buy-ticket.outputs.broken-in-list-items
                    parent:
                      nestedChild:
                        moreNestedChild: $steps.buy-ticket.outputs.broken-in-more-nested-child
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/requestBody/payload/broken",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-payload" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/requestBody/payload/listItems/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-list-items" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/requestBody/payload/parent/nestedChild/moreNestedChild",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-more-nested-child" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in criteria', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                onFailure:
                  - name: failure-action-1
                    type: end
                    criteria:
                      - condition: $statusCode == $steps.get-museum-hours.outputs.broken-in-simple-failure-criteria
                      - context: $response.body
                        condition: $.name == $steps.get-museum-hours.outputs.broken-in-jsonpath-failure-criteria
                        type: jsonpath
                      - context: $response.body
                        condition: $.name == $steps.get-museum-hours.outputs.broken-in-xpath-failure-criteria
                        type: xpath
                onSuccess:
                  - name: success-action-1
                    type: end
                    criteria:
                      - condition: $statusCode == $steps.get-museum-hours.outputs.broken-in-simple-success-criteria
                      - context: $response.body
                        condition: $.name == $steps.get-museum-hours.outputs.broken-in-jsonpath-success-criteria
                        type: jsonpath
                      - context: $response.body
                        condition: $.name == $steps.get-museum-hours.outputs.broken-in-xpath-success-criteria
                        type: xpath
                successCriteria:
                  - condition: $statusCode == $steps.get-museum-hours.outputs.broken-in-simple-success-criteria
                  - context: $response.body
                    condition: $.name == $steps.get-museum-hours.outputs.broken-in-jsonpath-success-criteria
                    type: jsonpath
                  - context: $response.body
                    condition: $.name == $steps.get-museum-hours.outputs.broken-in-xpath-success-criteria
                    type: xpath
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/successCriteria/0/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-simple-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/successCriteria/1/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-jsonpath-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/successCriteria/2/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-xpath-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/criteria/0/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-simple-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/criteria/1/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-jsonpath-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/criteria/2/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-xpath-success-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/criteria/0/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-simple-failure-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/criteria/1/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-jsonpath-failure-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/criteria/2/",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-xpath-failure-criteria" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in outputs', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                outputs:
                  brokenFromStep: $steps.buy-ticket.outputs.broken-in-outputs
                  brokenFromWorkflow: $workflows.get-museum-hours.outputs.broken-in-outputs
            outputs:
              brokenFromStep: $steps.buy-ticket.outputs.broken-in-outputs
              brokenFromWorkflow: $workflows.get-museum-hours.outputs.broken-in-outputs

      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/brokenFromStep",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-outputs" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/brokenFromWorkflow",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Output key "broken-in-outputs" is not defined in workflow "get-museum-hours". Available outputs: [ brokenFromStep, brokenFromWorkflow ].",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/brokenFromStep",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-outputs" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/brokenFromWorkflow",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Output key "broken-in-outputs" is not defined in workflow "get-museum-hours". Available outputs: [ brokenFromStep, brokenFromWorkflow ].",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in extendedSecurity', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                x-security:
                  - scheme:
                      type: http
                      scheme: basic
                    values:
                      username: $steps.get-museum-hours.outputs.broken-in-username
                      password: $workflows.get-museum-hours.outputs.broken-in-password
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/0/values/username",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-username" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-security/0/values/password",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Workflow "get-museum-hours" referenced in runtime expression "$workflows.get-museum-hours.outputs.broken-in-password" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in extendedOperation', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                x-operation:
                  url: $steps.get-museum-hours.outputs.broken-in-url
                  method: post
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/x-operation/url",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "get-museum-hours" referenced in runtime expression "$steps.get-museum-hours.outputs.broken-in-url" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in step', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
                outputs:
                  broken: $steps.buy-ticket.outputs.broken-in-outputs
                  brokenFromWorkflow: $workflows.get-museum-hours.outputs.broken-in-outputs
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/broken",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-outputs" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/outputs/brokenFromWorkflow",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Workflow "get-museum-hours" referenced in runtime expression "$workflows.get-museum-hours.outputs.broken-in-outputs" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on undefined outputs in workflow', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
            outputs:
              broken: $steps.buy-ticket.outputs.broken-in-outputs
              brokenFromWorkflow: $workflows.get-museum-hours.outputs.broken-in-outputs
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/broken",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Step "buy-ticket" referenced in runtime expression "$steps.buy-ticket.outputs.broken-in-outputs" is not defined or has no outputs.",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/outputs/brokenFromWorkflow",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Output key "broken-in-outputs" is not defined in workflow "get-museum-hours". Available outputs: [ broken, brokenFromWorkflow ].",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should NOT report errors for nested property access when top-level key is defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: events-crud
            steps:
              - stepId: list-events
                operationId: museum-api.listEvents
                outputs:
                  events: $response.body
              - stepId: create-event
                operationId: museum-api.createEvent
                requestBody:
                  contentType: application/json
                  payload:
                    dates:
                      - $steps.list-events.outputs.events.0.dates.0
                      - $steps.list-events.outputs.events.0.dates.1
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should NOT report errors for direct array index access on outputs', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: events-crud
            steps:
              - stepId: list-events
                operationId: museum-api.listEvents
                outputs:
                  events: $response.body
              - stepId: create-event
                operationId: museum-api.createEvent
                parameters:
                  - in: query
                    name: eventId
                    value: $steps.list-events.outputs.events.0
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should NOT report errors for JSON Pointer syntax with # delimiter', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: replacements
            steps:
              - stepId: first-step
                operationId: museum-api.getSpecialEvent
                outputs:
                  event: $response.body
              - stepId: second-step
                operationId: museum-api.buyMuseumTickets
                requestBody:
                  contentType: application/json
                  payload: $steps.first-step.outputs.event
                  replacements:
                    - target: /location
                      value: $steps.first-step.outputs.event#/name
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    // Should have no errors because 'event' is defined, and '#/name' is JSON Pointer access
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report error when output key before JSON Pointer is not defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: replacements
            steps:
              - stepId: first-step
                operationId: museum-api.getSpecialEvent
                outputs:
                  event: $response.body
              - stepId: second-step
                operationId: museum-api.buyMuseumTickets
                requestBody:
                  contentType: application/json
                  payload:
                    value: $steps.first-step.outputs.notDefined#/name
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'outputs-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/requestBody/payload/value",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Output key "notDefined" is not defined in step "first-step". Available outputs: [ event ].",
          "ruleId": "outputs-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
