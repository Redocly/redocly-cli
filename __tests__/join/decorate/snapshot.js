// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with options test with option: { name: 'decorate', value: true } 1`] = `
argv {
  _: [ 'join' ],
  decorate: true,
  apis: [ 'foo.yaml', 'bar.yaml' ],
  lint: false,
  preprocess: false,
  'prefix-tags-with-filename': false,
  prefixTagsWithFilename: false,
  output: 'openapi.yaml',
  o: 'openapi.yaml',
  '$0': '../../../packages/cli/src/index.ts'
}

openapi: 3.0.0
info:
  title: Example API
  description: This is an example API.
  version: 1.0.0
servers:
  - url: https://example.com/api
paths:
  /users/{userId}/orders/{orderId}:
    parameters:
      - name: userId
        in: path
        description: ID of the user
        required: true
        schema:
          type: integer
      - name: orderId
        in: path
        description: ID of the order
        required: true
        schema:
          type: integer
  /users/{userId}:
    parameters:
      - name: userId
        in: path
        description: ID of the user
        required: true
        schema:
          type: integer
    get:
      summary: Get user by ID
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - bar_other
components: {}
tags:
  - name: bar_other
    x-displayName: other
x-tagGroups:
  - name: bar
    tags:
      - bar_other

openapi.yaml: join processed in <test>ms


`;
