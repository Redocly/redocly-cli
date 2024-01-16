// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with options test with option: { name: 'prefix-tags-with-info-prop', value: 'title' } 1`] = `

openapi: 3.0.0
info:
  version: 1.0.0
  title: Example OpenAPI 3 definition with foo title.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://redocly.com/v1
tags:
  - name: Example OpenAPI 3 definition with foo title._Pet
    description: Pet Discription
    x-displayName: Pet
  - name: Example OpenAPI 3 definition with foo title._other
    x-displayName: other
  - name: Example OpenAPI 3 definition._Pet
    description: Pet Discription
    x-displayName: Pet
  - name: Example OpenAPI 3 definition._other
    x-displayName: other
paths:
  /pets:
    get:
      summary: Test summary
      operationId: exampleFoo
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
        - Example OpenAPI 3 definition with foo title._other
  /pets/{petId}:
    post:
      summary: summary example
      operationId: exampleBar
      responses:
        '201':
          description: example description
      tags:
        - Example OpenAPI 3 definition._other
components: {}
x-tagGroups:
  - name: foo
    tags:
      - Example OpenAPI 3 definition with foo title._Pet
      - Example OpenAPI 3 definition with foo title._other
  - name: bar
    tags:
      - Example OpenAPI 3 definition._Pet
      - Example OpenAPI 3 definition._other

openapi.yaml: join processed in <test>ms


`;
