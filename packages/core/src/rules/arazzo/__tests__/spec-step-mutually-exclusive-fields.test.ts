import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Arazzo spec-step-mutually-exclusive-fields', () => {
  it('reports a 1.0 step that uses operationId and workflowId together', async () => {
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
                workflowId: place-order
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        arazzo1Rules: { 'spec-step-mutually-exclusive-fields': 'error' },
      }),
    });

    expect(results.map((r) => r.message)).toContain(
      'A step can only use one of the following mutually exclusive fields: `operationId`, `workflowId`.'
    );
  });

  it('reports a 1.1 step that uses channelPath and operationId together', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: '1.1.0'
        info:
          title: Cool API
          version: 1.0.0
        sourceDescriptions:
          - name: account-events
            type: asyncapi
            url: asyncapi.yaml
          - name: cafe-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: place-order
            steps:
              - stepId: list-menu-items
                channelPath: $sourceDescriptions.account-events#/channels/userSignedup
                operationId: cafe-api.listMenuItems
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-mutually-exclusive-fields': 'error' },
      }),
    });

    expect(results.map((r) => r.message)).toContain(
      'A step can only use one of the following mutually exclusive fields: `operationId`, `channelPath`.'
    );
  });

  it('does not report a step that uses a single operation field', async () => {
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
                successCriteria:
                  - condition: $statusCode == 200
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'spec-step-mutually-exclusive-fields': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});
