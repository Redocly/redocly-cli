import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 oas3-no-example-value-and-externalValue', () => {
  it('oas3-no-example-value-and-externalValue: should report on example object with both value and external value', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            examples:
              some:
                value: 12
                externalValue: https://1.1.1.1
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-example-value-and-externalValue': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/examples/some/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example object can have either \`value\` or \`externalValue\` fields.",
          "ruleId": "no-example-value-and-externalValue",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('oas3-no-example-value-and-externalValue: should not report on example object with value OR external value', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            examples:
              some:
                value: 12
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-example-value-and-externalValue': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
