import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';
import { validateDocument } from '../../../validate';
import { LintConfig } from '../../..';
import { BaseResolver } from '../../../resolve';

describe('oas3 boolean-parameter-prefixes', () => {
  it('should report on boolean param without prefix', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: path
              schema:
                type: boolean
      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'boolean-parameter-prefixes': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/parameters/0/name",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Boolean parameter \`a\` should have \`is\` or \`has\` prefix.",
          "ruleId": "boolean-parameter-prefixes",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report on boolean param with prefix', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
                - name: hasA
                  in: path
                  schema:
                    type: boolean
                - name: isA
                  in: path
                  schema:
                    type: boolean
                - name: has_a
                  in: path
                  schema:
                    type: boolean
                - name: is-a
                  in: path
                  schema:
                    type: boolean
      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({ extends: [], rules: { 'boolean-parameter-prefixes': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report on boolean param with custom prefix', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
              - name: should-a
                in: query
                schema:
                  type: boolean
      `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'boolean-parameter-prefixes': {
            severity: 'error',
            prefixes: ['should'],
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
