import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('spec-discriminator-defaultMapping', () => {
  it('should pass when optional propertyName has defaultMapping (as a component name)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Base:
              type: object
              discriminator:
                propertyName: test
                defaultMapping: DefaultType
              properties:
                test:
                  type: string
            TypeA:
              allOf:
                - $ref: '#/components/schemas/Base'
            DefaultType:
              allOf:
                - $ref: '#/components/schemas/Base'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should pass when optional propertyName has defaultMapping (as a JSON Pointer)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Base:
              type: object
              discriminator:
                propertyName: test
                defaultMapping: '#/components/schemas/DefaultType'
              properties:
                test:
                  type: string
            TypeA:
              allOf:
                - $ref: '#/components/schemas/Base'
            DefaultType:
              allOf:
                - $ref: '#/components/schemas/Base'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should pass when required propertyName does not need defaultMapping (when the required property is in the parent schema)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Base:
              type: object
              discriminator:
                propertyName: test
                mapping:
                  a: TypeA
              required: [test]
              properties:
                test:
                  type: string
            TypeA:
              allOf:
                - $ref: '#/components/schemas/Base'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should pass when required propertyName does not need defaultMapping (when the required property is in the descendant schema)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
            Foo:
              type: object
              properties:
                test:
                  type: string
                  const: foo
              required: [test]
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should fail when propertyName is optional in a descendant oneOf schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
            Foo:
              type: object
              properties:
                test: # test is not required here
                  type: string
                  const: foo
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Used/discriminator",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Discriminator with optional property 'test' must include a defaultMapping field.",
          "ruleId": "spec-discriminator-defaultMapping",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should pass when propertyName is optional in a descendant oneOf schema but defaultMapping is provided', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Used:
              discriminator:
                propertyName: test
                defaultMapping: Foo
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
            Foo:
              type: object
              properties:
                test: # test is not required here
                  type: string
                  const: foo
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should pass when required propertyName does not need defaultMapping (when the required property is in the descendant schema)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Used:
              allOf:
                - $ref: '#/components/schemas/Base'
              discriminator:
                propertyName: test
            Base:
              type: object
              properties:
                test:
                  type: string
              required: [test]
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should fail when optional propertyName lacks defaultMapping', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Base:
              type: object
              discriminator:
                propertyName: test
                mapping:
                  a: TypeA
              properties:
                test:
                  type: string
            TypeA:
              allOf:
                - $ref: '#/components/schemas/Base'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Base/discriminator",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Discriminator with optional property 'test' must include a defaultMapping field.",
          "ruleId": "spec-discriminator-defaultMapping",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should fail when defaultMapping points to a non-existent component', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          schemas:
            Base:
              type: object
              discriminator:
                propertyName: test
                defaultMapping: TypeB
                mapping:
                  a: TypeA
              properties:
                test:
                  type: string
            TypeA:
              allOf:
                - $ref: '#/components/schemas/Base'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Base/discriminator/defaultMapping",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "defaultMapping value 'TypeB' does not point to an existing schema component.",
          "ruleId": "spec-discriminator-defaultMapping",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should pass for cyclic references where the discriminator property is required', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          schemas:
            Foo:
              oneOf:
                - type: object
                  properties:
                    test:
                      type: string
                      const: foo
                  required: [test]  
                - $ref: '#/components/schemas/Cyclic'
            Cyclic:
              allOf:
                - $ref: '#/components/schemas/Foo'
                - type: object
                  properties:
                    extra:
                      type: string
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]  
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should fail for cyclic references where the discriminator property is NOT required (oneOf -> allOf -> oneOf)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          schemas:
            Foo:
              oneOf:
                - $ref: '#/components/schemas/Cyclic'
                - type: object
                  properties:
                    test: # test is not required here
                      type: string
                      const: foo
            Cyclic:
              allOf:
                - type: object
                  properties:
                    extra:
                      type: string
                - $ref: '#/components/schemas/Foo'
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Used/discriminator",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Discriminator with optional property 'test' must include a defaultMapping field.",
          "ruleId": "spec-discriminator-defaultMapping",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should fail for cyclic references where the discriminator property is NOT required (allOf -> oneOf -> allOf)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          schemas:
            Foo:
              allOf:
                - $ref: '#/components/schemas/Cyclic'
                - type: object
                  properties:
                    test: # test is not required here
                      type: string
                      const: foo
            Cyclic:
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - type: object
                  properties:
                    extra:
                      type: string
            Bar:
              type: object
              properties:
                test:
                  type: string
                  const: bar
              required: [test]
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Used/discriminator",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Discriminator with optional property 'test' must include a defaultMapping field.",
          "ruleId": "spec-discriminator-defaultMapping",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should pass when there is a combination of the properties and required via allOf (discriminator for polymorphism)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          schemas:
            Foo:
              allOf:
                - $ref: '#/components/schemas/WithRequired'
                - type: object
                  properties:
                    test:
                      type: string
                      const: foo
            WithRequired:
              type: object
              required: [test]
            Bar:
              allOf:
                - type: object
                  properties:
                    test:
                      type: string
                      const: bar
                - required: [test]
            Used:
              discriminator:
                propertyName: test
              oneOf:
                - $ref: '#/components/schemas/Foo'
                - $ref: '#/components/schemas/Bar'

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  // it('should pass when there is a combination of the properties and required via allOf (discriminator for inheritance)', async () => {
  //   const document = parseYamlToDocument(
  //     outdent`
  //       openapi: 3.2.0
  //       paths:
  //         /:
  //           get:
  //             responses:
  //               200:
  //                 content:
  //                   application/json:
  //                     schema:
  //                       $ref: '#/components/schemas/Used'
  //       components:
  //         schemas:
  //           Used:
  //             type: object
  //             properties:
  //               base:
  //                 type: string
  //             discriminator:
  //               propertyName: test
  //           Foo:
  //             allOf:
  //               - $ref: '#/components/schemas/Used'
  //               - $ref: '#/components/schemas/WithRequired'
  //               - type: object
  //                 properties:
  //                   test:
  //                     type: string
  //                     const: foo
  //           WithRequired:
  //             required: [test]
  //           Bar:
  //             allOf:
  //               - $ref: '#/components/schemas/Used'
  //               - type: object
  //                 properties:
  //                   test:
  //                     type: string
  //                     const: bar
  //               - required: [test]
  //     `,
  //     'foobar.yaml'
  //   );

  //   const results = await lintDocument({
  //     externalRefResolver: new BaseResolver(),
  //     document,
  //     config: await createConfig({ rules: { 'spec-discriminator-defaultMapping': 'error' } }),
  //   });

  //   expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  // });
});
