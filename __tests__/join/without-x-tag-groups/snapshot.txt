

warning: 1 conflict(s) on the \`Pet\` tags description.
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
  - name: Pet
    description: Pet Discription
    x-displayName: Pet
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

openapi.yaml: join processed in <test>ms

