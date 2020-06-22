import { outdent } from 'outdent';

import { LintConfig } from '../../../config/config';

import { validateDocument } from '../../../validate';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../__tests__/utils';

describe('Oas3 oas3-server-trailing-slash', () => {
  it('oas3-server-trailing-slash: should report on info object with no contact', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            description: some text
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'defined-and-no-empty-string': { severity: 'error', options: { 'Info.contact': true } },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Info must have contact property.",
          "ruleId": "defined-and-no-empty-string",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-server-trailing-slash: should not report on info object with contact', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            contact:
              name: user
              email: admin@example.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'defined-and-no-empty-string': { severity: 'error', options: { 'Info.contact': true } },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });

  it('oas3-server-trailing-slash: should report on contact object with empty name', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            contact:
              name: ''
              email: admin@example.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'defined-and-no-empty-string': { severity: 'error', options: { 'Contact.name': true } },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/contact/name",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Contact object name must be non-empty string.",
          "ruleId": "defined-and-no-empty-string",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('oas3-server-trailing-slash: should not report on contact object with non-empty name', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            contact:
              name: name
              email: admin@example.com
        `,
      'foobar.yaml',
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'defined-and-no-empty-string': { severity: 'error', options: { 'Contact.name': true } },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
