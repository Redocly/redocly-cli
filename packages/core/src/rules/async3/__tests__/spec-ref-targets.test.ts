import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

async function lintWithRule(yaml: string) {
  const document = parseYamlToDocument(yaml, 'asyncapi.yaml');
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document,
    config: await createConfig({ rules: { 'spec-ref-targets': 'error' } }),
  });
}

describe('Async3 spec-ref-targets', () => {
  it('should not report when refs point to the required locations', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      servers:
        production:
          $ref: '#/components/servers/production'
      channels:
        ping:
          address: /ping
          servers:
            - $ref: '#/servers/production'
          messages:
            ping:
              $ref: '#/components/messages/ping'
        pong:
          address: /pong
          messages:
            pong:
              $ref: '#/components/messages/pong'
      operations:
        sendPing:
          action: send
          channel:
            $ref: '#/channels/ping'
          messages:
            - $ref: '#/channels/ping/messages/ping'
          reply:
            channel:
              $ref: '#/channels/pong'
            messages:
              - $ref: '#/channels/pong/messages/pong'
      components:
        servers:
          production:
            host: example.com
            protocol: ws
        messages:
          ping:
            payload:
              type: string
          pong:
            payload:
              type: string
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report operation channel and messages refs pointing to components', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      channels:
        ping:
          address: /ping
          messages:
            ping:
              $ref: '#/components/messages/ping'
      operations:
        sendPing:
          action: send
          channel:
            $ref: '#/components/channels/ping'
          messages:
            - $ref: '#/components/messages/ping'
      components:
        channels:
          ping:
            address: /ping
        messages:
          ping:
            payload:
              type: string
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/operations/sendPing/channel/$ref",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Operation \`channel\` must reference a channel from the root \`channels\` object.",
          "reference": "https://redocly.com/docs/cli/rules/async/spec-ref-targets",
          "ruleId": "spec-ref-targets",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/operations/sendPing/messages/0/$ref",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Operation \`messages\` must reference messages of the referenced channel (\`#/components/channels/ping/messages/...\`).",
          "reference": "https://redocly.com/docs/cli/rules/async/spec-ref-targets",
          "ruleId": "spec-ref-targets",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report reply channel and messages refs pointing to components', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      channels:
        ping:
          address: /ping
          messages:
            ping:
              $ref: '#/components/messages/ping'
      operations:
        sendPing:
          action: send
          channel:
            $ref: '#/channels/ping'
          reply:
            channel:
              $ref: '#/components/channels/pong'
            messages:
              - $ref: '#/components/messages/pong'
      components:
        channels:
          pong:
            address: /pong
            messages:
              pong:
                $ref: '#/components/messages/pong'
        messages:
          ping:
            payload:
              type: string
          pong:
            payload:
              type: string
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/operations/sendPing/reply/channel/$ref",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Operation reply \`channel\` must reference a channel from the root \`channels\` object.",
          "reference": "https://redocly.com/docs/cli/rules/async/spec-ref-targets",
          "ruleId": "spec-ref-targets",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/operations/sendPing/reply/messages/0/$ref",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Operation reply \`messages\` must reference messages of the referenced channel (\`#/components/channels/pong/messages/...\`).",
          "reference": "https://redocly.com/docs/cli/rules/async/spec-ref-targets",
          "ruleId": "spec-ref-targets",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report channel servers refs pointing to components', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      servers:
        production:
          host: example.com
          protocol: ws
      channels:
        ping:
          address: /ping
          servers:
            - $ref: '#/components/servers/production'
      components:
        servers:
          production:
            host: example.com
            protocol: ws
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/ping/servers/0/$ref",
              "reportOnKey": false,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Channel \`servers\` must reference servers from the root \`servers\` object.",
          "reference": "https://redocly.com/docs/cli/rules/async/spec-ref-targets",
          "ruleId": "spec-ref-targets",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report channels and operations defined in components', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      channels:
        ping:
          $ref: '#/components/channels/ping'
      components:
        servers:
          production:
            host: example.com
            protocol: ws
        channels:
          ping:
            address: /ping
            servers:
              - $ref: '#/components/servers/production'
        operations:
          sendPing:
            action: send
            channel:
              $ref: '#/components/channels/ping'
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report refs to other files', async () => {
    const results = await lintWithRule(outdent`
      asyncapi: 3.0.0
      info:
        title: Ping service
        version: 1.0.0
      operations:
        sendPing:
          action: send
          channel:
            $ref: './channels.yaml#/channels/ping'
    `);

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
