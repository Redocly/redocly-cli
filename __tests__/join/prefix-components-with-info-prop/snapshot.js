// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join join with options test with option: prefix-components-with-info-prop 1`] = `

openapi: 3.0.0
info:
  version: 1.0.0
  title: Example OpenAPI 3 definition foo.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
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
x-tagGroups:
  - name: foo
    tags:
      - Foo
      - foo_other
    description: Information about API
  - name: bar
    tags:
      - Bar
      - bar_other
    description: Information about API
servers:
  - url: https://redocly.com/v1
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
        - foo_other
  /pets/{petId}:
    post:
      summary: summary example
      operationId: exampleBar
      responses:
        '201':
          description: example description
      tags:
        - bar_other
components:
  schemas:
    Example OpenAPI 3 definition foo._some-property:
      description: foo description
      type: string
    Example OpenAPI 3 definition._some-property:
      description: bar description
      type: string

openapi.yaml: join processed in <test>ms


`;
