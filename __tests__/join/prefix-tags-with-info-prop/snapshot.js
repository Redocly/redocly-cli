// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with options test with option: { name: 'prefix-tags-with-info-prop', value: 'title' } 1`] = `

openapi: 3.0.0
info:
  version: 1.0.0
  title: Foo Example OpenAPI 3 definition with foo title.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://redocly.com/v1
tags:
  - name: Foo_Example_OpenAPI_3_definition_with_foo_title._Pet
    description: Pet Discription
    x-displayName: Pet
  - name: Foo_Example_OpenAPI_3_definition_with_foo_title._other
    x-displayName: other
  - name: Bar_Example_OpenAPI_3_definition._Pet
    description: Pet Discription
    x-displayName: Pet
  - name: Bar_Example_OpenAPI_3_definition._other
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
        - Foo_Example_OpenAPI_3_definition_with_foo_title._other
  /pets/{petId}:
    post:
      summary: summary example
      operationId: exampleBar
      responses:
        '201':
          description: example description
      tags:
        - Bar_Example_OpenAPI_3_definition._other
components: {}
x-tagGroups:
  - name: Foo Example OpenAPI 3 definition with foo title.
    tags:
      - Foo_Example_OpenAPI_3_definition_with_foo_title._Pet
      - Foo_Example_OpenAPI_3_definition_with_foo_title._other
  - name: Bar Example OpenAPI 3 definition.
    tags:
      - Bar_Example_OpenAPI_3_definition._Pet
      - Bar_Example_OpenAPI_3_definition._other

openapi.yaml: join processed in <test>ms


`;
