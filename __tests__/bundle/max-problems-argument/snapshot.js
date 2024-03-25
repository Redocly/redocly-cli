// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle max-problems-argument 1`] = `
openapi: 3.0.0
info:
  version: 1.0.0
  title: Swagger Petstore
  description: Information about Petstore
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: http://petstore.swagger.io/v1
security: []
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            format: int
      responses:
        '200':
          description: An paged array of pets
          header:
            x-next:
              description: A link to the next page of responses
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pets'
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    post:
      summary: Create a pet
      operationId: createPets
      tags:
        - pets
      responses:
        '201':
          description: Null response
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /pets/{petId}:
    get:
      summary: Info for a specific pet
      operationId: showPetById
      tags:
        - pets
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to retrieve
          schema:
            type: string
      responses:
        '200':
          description: Expected response to a valid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pets'
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  schemas:
    Error:
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
    Pet:
      required:
        - id
        - name
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        tag:
          type: string
    Pets:
      type: array
      items:
        $ref: '#/components/schemas/Pet'
openapi: 3.0.0
info:
  version: 1.0.0
  title: Swagger Petstore
  description: Information about Petstore
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: http://petstore.swagger.io/v1
security: []
paths:
  /pets:
    get:
      summay: List all pets
      operationIds: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            format: int
      responses:
        '200':
          description: An paged array of pets
          headers:
            x-next:
              description: A link to the next page of responses
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pets'
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    post:
      summary: Create a pet
      operationId: createPets
      tags:
        - pets
      responses:
        '201':
          description: Null response
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /pets/{petId}:
    get:
      summary: Info for a specific pet
      operationId: showPetById
      tags:
        - pets
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to retrieve
          schema:
            type: string
      responses:
        '200':
          description: Expected response to a valid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pets'
        '400':
          description: An error response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  schemas:
    Error:
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
    Pet:
      required:
        - id
        - name
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        tag:
          type: string
    Pets:
      type: array
      items:
        $ref: '#/components/schemas/Pet'

[WARNING] "format" option is deprecated and will be removed in a future release. 

[WARNING] "max-problems" option is deprecated and will be removed in a future release. 

foo.yaml:
  30:11  error    spec  Property \`header\` is not expected here.

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./foo.yaml...
📦 Created a bundle for ./foo.yaml at stdout <test>ms.
bar.yaml:
  15:7  error    spec  Property \`summay\` is not expected here.

< ... 3 more problems hidden > increase with \`--max-problems N\`
❌ Validation failed with 3 errors and 1 warning.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./bar.yaml...
📦 Created a bundle for ./bar.yaml at stdout <test>ms.

`;
