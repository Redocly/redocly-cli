import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('OAS3 license-url', () => {
  it('should report on info.license with no url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            license:
              name: MIT
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'info-license-url': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/license",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "License object should contain \\"url\\" field.",
          "ruleId": "info-license-url",
          "severity": "error",
        },
      ]
    `);
  });

  it('should not report on info.license with url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            license:
              name: MIT
              url: google.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'info-license-url': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
