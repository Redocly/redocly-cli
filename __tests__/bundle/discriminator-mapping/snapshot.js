// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle discriminator-mapping 1`] = `
openapi: 3.1.0
info: {}
paths:
  /test:
    get:
      responses:
        default:
          content:
            application/json:
              schema:
                type: object
                discriminator:
                  propertyName: discriminatedProp
                  mapping:
                    Foo: '#/components/schemas/foo'
                    Bar: '#/components/schemas/bar'
                oneOf:
                  - $ref: '#/components/schemas/foo'
                  - $ref: '#/components/schemas/bar'
components:
  schemas:
    foo:
      type: object
      properties:
        discriminatedProp:
          type: string
        foo:
          type: string
    bar:
      type: object
      properties:
        discriminatedProp:
          type: string
        bar:
          type: boolean

bundling ./main.yaml...
📦 Created a bundle for ./main.yaml at stdout <test>ms.

`;

exports[`E2E bundle with option: dereferenced discriminator mapping should be replaced with correct references to components 1`] = `
openapi: 3.1.0
info: {}
paths:
  /test:
    get:
      responses:
        default:
          content:
            application/json:
              schema:
                type: object
                discriminator:
                  propertyName: discriminatedProp
                  mapping:
                    Foo: '#/components/schemas/foo'
                    Bar: '#/components/schemas/bar'
                oneOf:
                  - type: object
                    properties: &ref_0
                      discriminatedProp:
                        type: string
                      foo:
                        type: string
                  - type: object
                    properties: &ref_1
                      discriminatedProp:
                        type: string
                      bar:
                        type: boolean
components:
  schemas:
    foo:
      type: object
      properties: *ref_0
    bar:
      type: object
      properties: *ref_1

bundling main.yaml...
📦 Created a bundle for main.yaml at stdout <test>ms.

`;
