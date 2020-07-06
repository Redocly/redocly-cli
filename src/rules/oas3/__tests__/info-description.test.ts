import { outdent } from 'outdent';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { LintConfig } from '../../../config/config';
import { BaseResolver } from '../../../resolve';

describe('Oas3 info-description', () => {
  it('should report on info with no description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            version: '1.0'
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'info-description': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Info object should contain \`description\` field.",
          "ruleId": "info-description",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on info with empty description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            version: '1.0'
            description: ''
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'info-description': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/description",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Info object \`description\` must be non-empty string.",
          "ruleId": "info-description",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on info with description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            description: test description
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'info-description': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
