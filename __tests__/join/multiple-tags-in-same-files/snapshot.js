// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join without options test: multiple-tags-in-same-files 1`] = `

openapi: 3.0.0
info:
  version: 1.0.0
  title: Example OpenAPI 3 definition.
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
  - name: foo
    tags:
      - Store
      - foo_other
  - name: bar
    tags:
      - Pets
      - Dog

openapi.yaml: join processed in <test>ms


`;
