import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 tag-description', () => {
  it('should report on tags with no description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: firstTag
            - name: secondTag
              description: some description goes here
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'tag-description': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/tags/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Tag object should contain \`description\` field.",
          "ruleId": "tag-description",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on tags with description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: firstTag
              description: bla
            - name: secondTag
              description: some description goes here
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'tag-description': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
