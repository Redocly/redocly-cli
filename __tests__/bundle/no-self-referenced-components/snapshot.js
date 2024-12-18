// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle no-self-referenced-components 1`] = `
openapi: 3.0.3
paths:
  /pets/{petId}:
    get:
      parameters:
        - $ref: '#/components/parameters/PetId'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
  parameters:
    PetId:
      name: petId
      in: path
      schema:
        type: string

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.

`;
