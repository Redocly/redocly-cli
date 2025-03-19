openapi: 3.1.0
info: {}
paths:
  /test:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/christmas-tree'
components:
  schemas:
    christmas-tree:
      type: array
      items:
        discriminator:
          propertyName: type
          mapping:
            popcorn: '#/components/schemas/popcorn'
            cranberry: '#/components/schemas/cranberry'
        anyOf:
          - $ref: '#/components/schemas/popcorn'
          - $ref: '#/components/schemas/cranberry'
    popcorn:
      type: object
      properties:
        type:
          type: string
          enum:
            - popcorn
    cranberry:
      type: object
      properties:
        type:
          type: string
          enum:
            - cranberry

bundling main.yaml...
📦 Created a bundle for main.yaml at stdout <test>ms.
