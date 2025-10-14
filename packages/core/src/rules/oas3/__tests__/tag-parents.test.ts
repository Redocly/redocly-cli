import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/load.js';

describe('Oas3.2 tag-parents', () => {
  it('should report on tag with undefined parent', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths: {}
        tags:
          - name: books
            parent: products
          - name: cds
            parent: products
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'tag-parents': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/0/parent",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Tag parent 'products' is not defined in the API description.",
          "ruleId": "tag-parents",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/1/parent",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Tag parent 'products' is not defined in the API description.",
          "ruleId": "tag-parents",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on tag with valid parent', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths: {}
        tags:
          - name: products
          - name: books
            parent: products
          - name: cds
            parent: products
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'tag-parents': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on circular reference', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        info:
          title: Test
          version: 1.0.0
        paths: {}
        tags:
          - name: foo
            parent: bar
          - name: bar
            parent: foo
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'tag-parents': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/0/parent",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Circular reference detected in tag parent hierarchy for tag 'foo'.",
          "ruleId": "tag-parents",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/1/parent",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Circular reference detected in tag parent hierarchy for tag 'bar'.",
          "ruleId": "tag-parents",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
