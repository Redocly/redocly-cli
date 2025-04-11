
openapi: 3.0.0
info:
  version: 1.0.0
  title: Foo Example OpenAPI 3 definition foo.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://redocly.com/v1
tags:
  - name: Foo
    description: Foo Discription
    x-displayName: Foo
  - name: foo_other
    x-displayName: other
  - name: Bar
    description: Bar Discription
    x-displayName: Bar
  - name: bar_other
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
      security:
        - Foo_Example_OpenAPI_3_definition_foo._scheme1: []
          Foo_Example_OpenAPI_3_definition_foo._scheme2: []
          Foo_Example_OpenAPI_3_definition_foo._scheme3: []
          Foo_Example_OpenAPI_3_definition_foo._scheme4: []
      tags:
        - foo_other
  /pets/{petId}:
    post:
      summary: summary example
      operationId: exampleBar
      responses:
        '201':
          description: example description
      security:
        - Bar_Example_OpenAPI_3_definition._scheme1: []
          Bar_Example_OpenAPI_3_definition._scheme2: []
        - Bar_Example_OpenAPI_3_definition._scheme3: []
          Bar_Example_OpenAPI_3_definition._scheme4: []
      tags:
        - bar_other
components:
  schemas:
    Foo_Example_OpenAPI_3_definition_foo._some-property:
      description: foo description
      type: string
    Foo_Example_OpenAPI_3_definition_foo._another-property:
      description: description
      $ref: '#/components/schemas/Foo_Example_OpenAPI_3_definition_foo._some-property'
    Bar_Example_OpenAPI_3_definition._some-property:
      description: bar description
      type: string
      nullable: true
      default: null
    Bar_Example_OpenAPI_3_definition._another-property:
      description: description
      $ref: '#/components/schemas/Bar_Example_OpenAPI_3_definition._some-property'
x-tagGroups:
  - name: Foo Example OpenAPI 3 definition foo.
    tags:
      - Foo
      - foo_other
  - name: Bar Example OpenAPI 3 definition.
    tags:
      - Bar
      - bar_other

openapi.yaml: join processed in <test>ms

