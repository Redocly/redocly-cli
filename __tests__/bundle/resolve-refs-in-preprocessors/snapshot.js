// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle resolve-refs-in-preprocessors 1`] = `
openapi: 3.0.1
info:
  license:
    name: PROPRIETARY
    url: http://localhost:8080
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:8080
security: []
paths:
  /items:
    get:
      operationId: getItems
      summary: Items
      responses:
        '200':
          $ref: '#/components/responses/successful-request.response'
        '400':
          $ref: '#/components/responses/bad-request-error.response'
  /status:
    get:
      operationId: getStatus
      summary: Status
      responses:
        '200':
          $ref: '#/components/responses/successful-request.response'
        '400':
          $ref: '#/components/responses/bad-request-error.response'
components:
  responses:
    successful-request.response:
      description: Success
      content:
        application/json:
          schema:
            type: array
            items:
              type: string
    bad-request-error.response:
      description: Failure
      content:
        application/json+problem:
          schema: null

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at stdout <test>ms.

`;
