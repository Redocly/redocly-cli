
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
  - name: foo_other
    x-displayName: other
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
components: {}
x-tagGroups:
  - name: Foo Example OpenAPI 3 definition.
    tags:
      - foo_other
  - name: Bar Example OpenAPI 3 definition.
    tags:
      - bar_other

openapi.yaml: join processed in <test>ms

