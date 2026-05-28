import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-parameters-in-by-context', () => {
  it('should not report when step references operationId and parameters specify `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
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
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when step references operationId but a parameter is missing `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
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
                  - name: Secret
                    value: Basic Og==
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Parameter \`in\` field MUST be specified when the parent does not reference a \`workflowId\`.",
          "ruleId": "spec-parameters-in-by-context",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when step references workflowId and a parameter has `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: outer
            inputs:
              type: object
              properties:
                token:
                  type: string
            steps:
              - stepId: call-inner
                workflowId: inner
                parameters:
                  - in: header
                    name: token
                    value: abc
          - workflowId: inner
            steps:
              - stepId: noop
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/0/in",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Parameter \`in\` field MUST NOT be specified when the parent references a \`workflowId\`; parameters map to workflow inputs.",
          "ruleId": "spec-parameters-in-by-context",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when step references workflowId and parameter has no `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: outer
            steps:
              - stepId: call-inner
                workflowId: inner
                parameters:
                  - name: token
                    value: abc
          - workflowId: inner
            steps:
              - stepId: noop
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report a struct error when an action parameter specifies `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: outer
            steps:
              - stepId: step-1
                operationId: museum-api.getMuseumHours
                onSuccess:
                  - name: go-next
                    type: goto
                    workflowId: inner
                    parameters:
                      - in: header
                        name: token
                        value: abc
          - workflowId: inner
            steps:
              - stepId: noop
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { struct: 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/parameters/0/in",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Property \`in\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when onFailure action with workflowId has parameter without `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: outer
            steps:
              - stepId: step-1
                operationId: museum-api.getMuseumHours
                onFailure:
                  - name: recover
                    type: goto
                    workflowId: inner
                    parameters:
                      - name: token
                        value: abc
          - workflowId: inner
            steps:
              - stepId: noop
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when onSuccess action without workflowId defines parameters', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: outer
            steps:
              - stepId: step-1
                operationId: museum-api.getMuseumHours
                onSuccess:
                  - name: go-step
                    type: goto
                    stepId: step-2
                    parameters:
                      - in: header
                        name: token
                        value: abc
              - stepId: step-2
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/parameters",
              "reportOnKey": true,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Parameters on success actions are only valid when the action references a \`workflowId\`.",
          "ruleId": "spec-parameters-in-by-context",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should ignore reusable parameters (only `reference`)', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        components:
          parameters:
            shared:
              in: header
              name: token
              value: abc
        workflows:
          - workflowId: outer
            steps:
              - stepId: step-1
                operationId: museum-api.getMuseumHours
                parameters:
                  - reference: $components.parameters.shared
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when workflow-level parameters specify `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            parameters:
              - in: header
                name: Secret
                value: Basic Og==
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when workflow-level parameter is missing `in`', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            parameters:
              - name: Secret
                value: Basic Og==
            steps:
              - stepId: get-museum-hours
                operationId: museum-api.getMuseumHours
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-parameters-in-by-context': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Parameter \`in\` field MUST be specified when the parent does not reference a \`workflowId\`.",
          "ruleId": "spec-parameters-in-by-context",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
