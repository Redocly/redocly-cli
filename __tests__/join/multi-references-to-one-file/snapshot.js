// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join without options test: multi-references-to-one-file 1`] = `

openapi: 3.0.3
info:
  title: Sample API
  description: My sample api
  version: 0.0.1
  license:
    name: Internal
    url: https://mycompany.com/license
tags:
  - name: GetSingleFoo
    description: Get a single foo
    x-displayName: GetSingleFoo
  - name: Foo
    description: All foo operations
    x-displayName: Foo
  - name: foo_other
    x-displayName: other
  - name: CreateBar
    description: Create a new Bar
    x-displayName: CreateBar
  - name: bar_other
    x-displayName: other
paths:
  /foo/{id}:
    get:
      summary: Returns a single foo
      operationId: getFoo
      responses:
        '200':
          description: One single Food
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
      tags:
        - foo_other
  /bar/:
    post:
      summary: Create a single bar
      operationId: createBar
      responses:
        '200':
          description: One single bar
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
      tags:
        - bar_other
components:
  schemas:
    FooObject:
      type: object
      properties:
        x:
          type: string
        'y':
          type: string
    Response:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        subFoo:
          $ref: '#/components/schemas/FooObject'
x-tagGroups:
  - name: Sample API
    tags:
      - GetSingleFoo
      - Foo
      - foo_other
  - name: bar
    tags:
      - CreateBar
      - bar_other

openapi.yaml: join processed in <test>ms


`;
