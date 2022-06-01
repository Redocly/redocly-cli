// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with-options prefix-tags-with-filename: should pass 1`] = `

openapi: 3.0.0
info:
  version: 1.0.0
  title: Example OpenAPI 3 definition.
  description: Information about API
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
tags:
  - name: foo_Pet
    description: Pet Discription
    x-displayName: Pet
  - name: foo_other
    x-displayName: other
  - name: bar_Pet
    description: Pet Discription
    x-displayName: Pet
  - name: bar_other
    x-displayName: other
x-tagGroups:
  - name: foo
    tags:
      - foo_Pet
      - foo_other
    description: Information about API
  - name: bar
    tags:
      - bar_Pet
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
components: {}

openapi.yaml: join processed in <test>ms


`;
