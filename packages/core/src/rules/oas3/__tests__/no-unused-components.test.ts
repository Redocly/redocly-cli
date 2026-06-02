import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-unused-components', () => {
  it('should report unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              parameters:
                - $ref: '#/components/parameters/used'
        components:
          parameters:
            used:
              name: used
            unused:
              name: unused
          responses:
            unused: {}
          examples:
            unused: {}
          requestBodies:
            unused: {}
          headers:
            unused: {}
          schemas:
            Unused:
              type: integer
              enum:
                - 1
                - 2
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/parameters/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "Unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/responses/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/examples/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/requestBodies/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/headers/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report unused mediaTypes components in OAS 3.2', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  description: OK
                  content:
                    $ref: '#/components/mediaTypes/used'
        components:
          mediaTypes:
            unused:
              'application/json':
                schema:
                  type: string
            used:
              'application/json':
                schema:
                  type: object
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/mediaTypes/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report unused components using allOf BUT NOT report those referencing a discriminator via allOf', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: array
                        items:
                          $ref: '#/components/schemas/Pet'
        components:
          schemas:
            Pet:
              type: object
              properties:
                petType:
                  type: string
              discriminator:
                propertyName: petType
                defaultMapping: '#/components/schemas/Cat'
              required:
                - petType
            Cat:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  name:
                    type: string
            Dog:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  bark:
                    type: string
            Lizard:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  lovesRocks:
                    type: boolean
            Unused:
              allOf:
                - type: object
                  properties:
                    one:
                      type: string
                - type: object
                  properties:
                    two:
                      type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "Unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report unused securitySchemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        components:
          securitySchemes:
            unused:
              type: apiKey
              name: unused
              in: header
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/securitySchemes/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Security scheme: "unused" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report securitySchemes referenced via SecurityRequirement from webhooks or components.pathItems', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          securitySchemes:
            webhook_key:
              type: apiKey
              name: webhook-key
              in: header
            shared_key:
              type: apiKey
              name: shared-key
              in: header
          pathItems:
            shared:
              get:
                security:
                  - shared_key: []
                responses:
                  '200':
                    description: ok
        webhooks:
          newPet:
            post:
              security:
                - webhook_key: []
              responses:
                '200':
                  description: ok
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(results).toEqual([]);
  });

  it('should not report securitySchemes referenced via SecurityRequirement', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /foo:
            get:
              security:
                - api_key: []
              responses:
                '200':
                  description: ok
          /bar:
            get:
              security:
                - derived: []
              responses:
                '200':
                  description: ok
        components:
          securitySchemes:
            api_key:
              type: apiKey
              name: api-key
              in: header
          
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(results).toEqual([]);
  });

  it('should report correct location for referenced securitySchemes', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /foo:
            get:
              security:
                - base: []
        components:
          securitySchemes:
            base:
              type: apiKey
              name: x-api-key
              in: header
            derived:
              $ref: '#/components/securitySchemes/base'
      `
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/securitySchemes/derived",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Security scheme: "derived" is never used.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unused-components",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
