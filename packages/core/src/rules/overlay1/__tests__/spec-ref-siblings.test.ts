import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Overlay spec-ref-siblings', () => {
  it('should report action fields and a missing target next to a reusable action `$ref`', async () => {
    const document = parseYamlToDocument(
      outdent`
        overlay: 1.2.0
        info:
          title: Error responses
          version: 1.0.0
        components:
          actions:
            notFound:
              fields:
                update:
                  '404':
                    description: Not Found
        actions:
          - $ref: '#/components/actions/notFound'
            target: $.paths.*.get.responses
            description: Adds a 404 response.
            x-owner: docs
          - $ref: '#/components/actions/notFound'
            target: $.paths.*.post.responses
            update:
              '409':
                description: Conflict
          - $ref: '#/components/actions/notFound'
      `,
      'overlay.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-ref-siblings': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/actions/1/update",
              "reportOnKey": true,
              "source": "overlay.yaml",
            },
          ],
          "message": "Property \`update\` is not expected here because it is defined alongside \`$ref\`.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-ref-siblings",
          "ruleId": "spec-ref-siblings",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/actions/2",
              "reportOnKey": true,
              "source": "overlay.yaml",
            },
          ],
          "message": "The field \`target\` must be present next to \`$ref\`.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-ref-siblings",
          "ruleId": "spec-ref-siblings",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
