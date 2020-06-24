import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('Oas3 oas3-no-server-trailing-slash', () => {
  it('oas3-no-server-trailing-slash: should report on server object with trailing slash', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          servers:
            - url: https://somedomain.com/
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-server-trailing-slash': 'error' } }),
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
          "message": "Server URL should not have a trailing slash.",
          "ruleId": "no-server-trailing-slash",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-no-server-trailing-slash: should not report on server object with no trailing slash', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          servers:
            - url: https://somedomain.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({ extends: [], rules: { 'no-server-trailing-slash': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
