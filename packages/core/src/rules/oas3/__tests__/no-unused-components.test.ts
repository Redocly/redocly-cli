import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 no-unused-components', () => {
  it('should report unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
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
      config: await makeConfig({ 'no-unused-components': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/parameters/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/schemas/Unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"Unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/responses/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/examples/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/requestBodies/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/headers/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should properly handle allOf when reporting unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
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
              allOf:
              - type: object
                properties:
                  one:
                    type: string
              - type: object
                properties:
                  two:
                    type: string
            # this is referenced so is considered used
            Pet:
              type: object
              properties:
                petType:
                  type: string
              discriminator:
                propertyName: petType
              required:
                - petType
            # this is potentially used
            Cat:
              allOf:
              - $ref: '#/components/schemas/Pet'
              - type: object
                properties:
                  name:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'no-unused-components': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/parameters/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/schemas/Unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"Unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/responses/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/examples/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/requestBodies/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/headers/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: \\"unused\\" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
