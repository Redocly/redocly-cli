// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with options test with option: { name: 'prefix-components-with-info-prop', value: 'title' } 1`] = `

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
        - Foo Example OpenAPI 3 definition foo._scheme1: []
          Foo Example OpenAPI 3 definition foo._scheme2: []
          Foo Example OpenAPI 3 definition foo._scheme3: []
          Foo Example OpenAPI 3 definition foo._scheme4: []
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
        - Bar Example OpenAPI 3 definition._scheme1: []
          Bar Example OpenAPI 3 definition._scheme2: []
        - Bar Example OpenAPI 3 definition._scheme3: []
          Bar Example OpenAPI 3 definition._scheme4: []
      tags:
        - bar_other
components:
  schemas:
    Foo Example OpenAPI 3 definition foo._some-property:
      description: foo description
      type: string
    Foo Example OpenAPI 3 definition foo._another-property:
      description: description
      $ref: '#/components/schemas/Foo Example OpenAPI 3 definition foo._some-property'
    Bar Example OpenAPI 3 definition._some-property:
      description: bar description
      type: string
    Bar Example OpenAPI 3 definition._another-property:
      description: description
      $ref: '#/components/schemas/Bar Example OpenAPI 3 definition._some-property'
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


`;
