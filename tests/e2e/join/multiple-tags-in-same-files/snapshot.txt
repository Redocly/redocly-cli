
openapi: 3.0.0
info:
  version: 1.0.0
  title: Foo Example OpenAPI 3 definition.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://redocly.com/v1
tags:
  - name: Store
    description: Store tags
    x-displayName: Store
  - name: foo_other
    x-displayName: other
  - name: Pets
    description: Pets description
    x-displayName: Pets
  - name: Dog
    description: Wild description
    x-displayName: Dog
paths:
  /cart:
    get:
      summary: Example cart
      operationId: exampleCart
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
          description: example description
      tags:
        - foo_other
  /store:
    get:
      tags:
        - Store
      summary: Store summary
      operationId: exampleStore
      responses:
        '200':
          description: Store 200 description
  /pets/{petId}:
    post:
      tags:
        - Pets
      summary: PetsId example
      operationId: examplePetsId
      responses:
        '201':
          description: example description
  /dog/{dogId}:
    post:
      tags:
        - Dog
      summary: Dog example
      operationId: exampleDogId
      responses:
        '201':
          description: example description
components: {}
x-tagGroups:
  - name: Foo Example OpenAPI 3 definition.
    tags:
      - Store
      - foo_other
  - name: Bar Example OpenAPI 3 definition.
    tags:
      - Pets
      - Dog

openapi.yaml: join processed in <test>ms

