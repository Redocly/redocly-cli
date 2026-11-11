import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-querystring-parameters', () => {
  it('should report querystring parameters that are repeated or mixed with query parameters', async () => {
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
          - workflowId: list-menu
            parameters:
              - in: querystring
                name: filters
                value: search=latte
            steps:
              - stepId: mixed-with-query
                operationId: cafe-api.listMenuItems
                parameters:
                  - in: query
                    name: limit
                    value: 1
              - stepId: second-querystring
                operationId: cafe-api.listMenuItems
                parameters:
                  - reference: $components.parameters.paging
        components:
          parameters:
            paging:
              in: querystring
              name: paging
              value: limit=1
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1_1Rules: { 'spec-querystring-parameters': 'error' },
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
          "message": "Parameters with \`in: query\` cannot be used together with \`in: querystring\` in the same step, including the parameters of its workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-querystring-parameters",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/1/parameters/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Parameters with \`in: querystring\` should be defined only once per step, including the parameters of its workflow.",
          "reference": "https://redocly.com/docs/cli/rules/arazzo/spec-querystring-parameters",
          "ruleId": "spec-querystring-parameters",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should accept a step parameter that replaces the querystring parameter of its workflow', async () => {
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
          - workflowId: list-menu
            parameters:
              - in: querystring
                name: filters
                value: search=latte
            steps:
              - stepId: replace-querystring
                operationId: cafe-api.listMenuItems
                parameters:
                  - in: querystring
                    name: filters
                    value: search=tiramisu
              - stepId: run-workflow
                workflowId: list-drinks
                parameters:
                  - name: search
                    value: latte
          - workflowId: list-drinks
            steps:
              - stepId: query-only
                operationId: cafe-api.listMenuItems
                parameters:
                  - in: query
                    name: search
                    value: latte
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1_1Rules: { 'spec-querystring-parameters': 'error' },
      }),
    });

    expect(results).toEqual([]);
  });
});
