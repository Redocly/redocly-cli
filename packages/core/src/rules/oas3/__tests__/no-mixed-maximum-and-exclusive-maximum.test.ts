import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-mixed-maximum-and-exclusive-maximum', () => {
  it('should report when both maximum and exclusiveMaximum are used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: number
                        maximum: 10
                        exclusiveMaximum: 10
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-mixed-maximum-and-exclusive-maximum': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/schema/exclusiveMaximum",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Schema should not have both \`maximum\` and \`exclusiveMaximum\`. Use one or the other.",
          "ruleId": "no-mixed-maximum-and-exclusive-maximum",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when both minimum and exclusiveMinimum are used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: number
                        minimum: 0
                        exclusiveMinimum: 0
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-mixed-maximum-and-exclusive-maximum': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/schema/exclusiveMinimum",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Schema should not have both \`minimum\` and \`exclusiveMinimum\`. Use one or the other.",
          "ruleId": "no-mixed-maximum-and-exclusive-maximum",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when only maximum is used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: number
                        maximum: 10
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-mixed-maximum-and-exclusive-maximum': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when only exclusiveMaximum is used', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: number
                        exclusiveMaximum: 10
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-mixed-maximum-and-exclusive-maximum': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report both maximum and minimum violations in the same schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: number
                        minimum: 0
                        exclusiveMinimum: 0
                        maximum: 100
                        exclusiveMaximum: 100
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: { 'no-mixed-maximum-and-exclusive-maximum': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/schema/exclusiveMaximum",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Schema should not have both \`maximum\` and \`exclusiveMaximum\`. Use one or the other.",
          "ruleId": "no-mixed-maximum-and-exclusive-maximum",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/schema/exclusiveMinimum",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Schema should not have both \`minimum\` and \`exclusiveMinimum\`. Use one or the other.",
          "ruleId": "no-mixed-maximum-and-exclusive-maximum",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
