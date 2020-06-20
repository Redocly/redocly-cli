import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('OAS3 oas3-examples-value-or-externalValue', () => {
  it('oas3-examples-value-or-externalValue: should report on example object with both value and external value', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            examples:
              some:
                value: 12
                externalValue: https://1.1.1.1
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: { 'example-value-or-external-value': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/examples/some/value",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example object can have either \\"value\\" or \\"externalValue\\" fields.",
          "ruleId": "example-value-or-external-value",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-examples-value-or-externalValue: should not report on example object with value OR external value', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            examples:
              some:
                value: 12
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: { 'example-value-or-external-value': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
