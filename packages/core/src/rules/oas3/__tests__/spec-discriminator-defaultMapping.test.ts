import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('spec-discriminator-defaultMapping', () => {
  it('should pass when optional propertyName has defaultMapping', async () => {
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

  it('should pass when required propertyName does not need defaultMapping', async () => {
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
              required:
                - test
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
});
