import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/load.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('no-duplicated-enum-values', () => {
  it('should report duplicated enum values', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            Foo:
              type: string
              enum:
                - foo
                - bar
                - foo
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-enum-values': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Foo/enum/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicated enum value found: 'foo'.",
          "reference": "https://redocly.com/docs/cli/rules/common/no-duplicated-enum-values",
          "ruleId": "no-duplicated-enum-values",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on unique enum values', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            Foo:
              type: string
              enum:
                - foo
                - bar
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-enum-values': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
