import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/load.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('no-unsafe-markdown', () => {
  it('should report on script tags, event handlers, and javascript URLs in description fields', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          description: Hello <script>alert('foo')</script>
        tags:
          - name: foo
            description: <img src=x onerror=alert('bar')>
          - name: bar
            description: '[click](javascript:alert("baz"))'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unsafe-markdown': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/description",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Markdown descriptions must not contain '<script>' tags.",
          "reference": "https://redocly.com/docs/cli/rules/common/no-unsafe-markdown",
          "ruleId": "no-unsafe-markdown",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/0/description",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Markdown descriptions must not contain HTML event handler attributes.",
          "reference": "https://redocly.com/docs/cli/rules/common/no-unsafe-markdown",
          "ruleId": "no-unsafe-markdown",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/1/description",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Markdown descriptions must not contain 'javascript:' URLs.",
          "reference": "https://redocly.com/docs/cli/rules/common/no-unsafe-markdown",
          "ruleId": "no-unsafe-markdown",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on safe descriptions', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          description: 'Runs eval(input) on <scripted> data; see JavaScript: The Definitive Guide'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unsafe-markdown': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
