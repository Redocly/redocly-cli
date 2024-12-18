// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle operation-description-override 1`] = `
openapi: 3.1.0
info:
  description: some description
  title: Example OpenAPI 3 definition.
  version: 1.0.0
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  contact:
    name: qa
    url: https://swagger.io/specification/#definitions
    email: email@redocly.com
servers:
  - url: //petstore.swagger.io/v2
    description: Default server
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: |
        Create a pet **test** description.
      operationId: updatePet
      responses:
        '200':
          description: ok
        '400':
          description: Invalid ID supplied
        '404':
          description: Pet not found
        '405':
          description: Validation exception
  /user:
    post:
      tags:
        - user
      summary: Create user
      description: |
        Create a user **test** description.
      operationId: createUser
      responses:
        '200':
          description: ok
components: {}

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.

`;
