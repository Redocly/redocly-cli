import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('no-schema-type-mismatch rule', () => {
  it('should report a warning for object type with items field', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: object
                      items:
                        type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([
      {
        location: [
          {
            pointer: '#/paths/~1test/get/responses/200/content/application~1json/schema/items',
            reportOnKey: false,
            source: 'test.yaml',
          },
        ],
        message: "Schema type mismatch: 'object' type should not contain 'items' field.",
        ruleId: 'no-schema-type-mismatch',
        severity: 'warn',
        suggest: [],
      },
    ]);
  });

  it('should report a warning for array type with properties field', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: array
                      properties:
                        name:
                          type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([
      {
        location: [
          {
            pointer: '#/paths/~1test/get/responses/200/content/application~1json/schema/properties',
            reportOnKey: false,
            source: 'test.yaml',
          },
        ],
        message: "Schema type mismatch: 'array' type should not contain 'properties' field.",
        ruleId: 'no-schema-type-mismatch',
        severity: 'warn',
        suggest: [],
      },
    ]);
  });

  it('should not report a warning for valid schemas', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        name:
                          type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });

  it('should work for AsyncAPI 3', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Test
          version: 1.0.0
        channels:
          userSignedup:
            messages:
              Test:
                $ref: '#/components/messages/Test'
        components:
          messages:
            Test:
              payload:
                type: object
                properties:
                  correct:
                    type: object
                    properties:
                      foo:
                        type: string
                  incorrect:
                    type: object
                    items: # incorrect
                      type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot();
  });

  it('should work for AsyncAPI 2.6', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Test API
          version: '1.0.0'
        components:
          schemas:
            Test:
              type: object
              properties:
                correct:
                  type: array
                  items:
                    type: string
                incorrect:
                  type: array
                  properties: # incorrect
                    foo:
                      type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot();
  });

  it('should work for Arazzo 1.0.1', async () => {
    const document = parseYamlToDocument(
      outdent`
        arazzo: 1.0.1
        info:
          title: Test inputs
          version: 1.0.0
        workflows:
          - workflowId: test
            inputs:
              type: object
              properties:
                correct:
                  type: array
                  items:
                    type: string
                incorrect:
                  type: array
                  properties: # incorrect
                    foo:
                      type: string
            steps:
              - stepId: test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-schema-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot();
  });
});
