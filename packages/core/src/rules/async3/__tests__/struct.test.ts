import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Async3 struct', () => {
  it('should report an unexpected property on a message', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Account Service
          version: 1.0.0
        channels:
          userSignedup:
            address: user/signedup
            messages:
              UserSignedUp:
                UserSignedUp:
                  payload:
                    type: nonsense
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/channels/userSignedup/messages/UserSignedUp/UserSignedUp",
              "reportOnKey": true,
              "source": "asyncapi.yaml",
            },
          ],
          "message": "Property \`UserSignedUp\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should allow specification extensions on a message and a message trait', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '3.0.0'
        info:
          title: Account Service
          version: 1.0.0
        channels:
          userSignedup:
            address: user/signedup
            messages:
              UserSignedUp:
                x-internal: true
                payload:
                  type: object
                traits:
                  - x-vendor-id: 42
      `,
      'asyncapi.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
