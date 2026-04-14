import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Async2 channels-kebab-case', () => {
  it('should report on no kebab-case channel path', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          channel1:
            address: /NOT_A_KEBAB/
            payload:
              type: object
        `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'channels-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/channel1",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "\`/NOT_A_KEBAB/\` does not use kebab-case.",
          "ruleId": "channels-kebab-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on snake_case in channel path', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          channel1:
            address: snake_kebab
            payload:
              type: object
        `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'channels-kebab-case': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/channels/channel1",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "\`snake_kebab\` does not use kebab-case.",
          "ruleId": "channels-kebab-case",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should allow trailing slash in channel path with "channels-kebab-case" rule', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          channel1:
            address: kebab/
            payload:
              type: object
        `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'paths-kebab-case': 'error',
          'no-path-trailing-slash': 'off',
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('words with hyphens are allowed with "channels-kebab-case" rule', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Cool API
          version: 1.0.0
        channels:
          channel1:
            address: kebab-with-longer-channel-path:/
            payload:
              type: object
        `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'paths-kebab-case': 'error',
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
