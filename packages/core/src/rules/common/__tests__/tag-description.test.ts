import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/load.js';

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
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'tag-description': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/0/description",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Tag object should contain \`description\` field.",
          "ruleId": "tag-description",
          "severity": "error",
          "suggest": [],
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
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'tag-description': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
