import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { makeConfig } from '../../__tests__/config';
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

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: makeConfig({ 'tag-description': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/tags/0/description",
              "reportOnKey": true,
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

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: makeConfig({ 'tag-description': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
