// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle-description-dereferenced 1`] = `
openapi: 3.1.0
info:
  version: 1.0.0
  title: Example.com
  termsOfService: https://example.com/terms/
  contact:
    email: contact@example.com
    url: http://example.com/contact
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  description: |
    This is an **example** API to demonstrate features of the OpenAPI
    specification.
servers:
  - url: https://example.com/api/v1
paths:
  /users:
    post:
      summary: user
      description: User.
      operationId: createUser
      responses:
        '200':
          description: OK
      requestBody:
        description: Updated user object
        content:
          application/json:
            schema:
              description: Names and Numbers (specific)
              $ref: '#/components/schemas/NamesAndNumbers'
        required: true
components:
  schemas:
    Name:
      type: string
      description: Generic Name.
    Number:
      type: integer
    Names:
      type: object
      description: names description
      properties:
        oneName:
          $ref: '#/components/schemas/Name'
          description: One name (specific).
        otherName:
          $ref: '#/components/schemas/Name'
          description: Other name (specific).
    Numbers:
      type: object
      description: numbers description
      properties:
        oneNumber:
          $ref: '#/components/schemas/Number'
          description: One number (specific)
        otherNumber:
          $ref: '#/components/schemas/Number'
          description: Other number (specific)
    NamesAndNumbers:
      type: object
      description: names and numbers description
      properties:
        names:
          $ref: '#/components/schemas/Names'
        numbers:
          $ref: '#/components/schemas/Numbers'

No configurations were defined in extends -- using built in recommended configuration by default.
Warning! This default behavior is going to be deprecated soon.

test.yaml:
  23:7  warning  operation-4xx-response  Operation must have at least one \`4xx\` response.

Woohoo! Your OpenAPI definitions are valid. 🎉
You have 1 warning.

bundling ./test.yaml...
📦 Created a bundle for ./test.yaml at stdout <test>ms.

`;