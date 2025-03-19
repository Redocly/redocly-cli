openapi: 3.0.1
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://redocly-example.com:8080
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
          schema:
            $ref: '#/components/schemas/error-schema'
  schemas:
    error-schema:
      type: object
      properties:
        message:
          type: string
        error_code:
          type: number

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
