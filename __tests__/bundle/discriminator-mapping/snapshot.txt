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

bundling main.yaml...
📦 Created a bundle for main.yaml at stdout <test>ms.
