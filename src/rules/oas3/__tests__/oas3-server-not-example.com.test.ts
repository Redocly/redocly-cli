import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('Oas3 oas3-no-server-example.com', () => {
  it('oas3-no-server-example.com: should report on server object with "example.com" url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          servers:
            - url: example.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-server-example.com': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/servers/0/url",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Server URL should not point at example.com.",
          "ruleId": "no-server-example.com",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-no-server-example.com: should not report on server object with not "example.com" url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          servers:
            - url: not-example.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-server-example.com': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
