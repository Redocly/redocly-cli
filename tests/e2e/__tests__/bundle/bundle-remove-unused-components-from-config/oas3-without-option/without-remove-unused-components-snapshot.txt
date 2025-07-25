openapi: 3.1.0
paths:
  /store/order:
    post:
      operationId: storeOrder
      responses:
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ref'
components:
  parameters:
    x:
      name: x
  examples:
    Order:
      value:
        quantity: 1
        shipDate: '2018-10-19T16:46:45Z'
        status: placed
        complete: false
  schemas:
    ApiResponse:
      type: object
      properties:
        code:
          type: integer
          format: int32
    ref:
      type: string
  requestBodies:
    UserArray:
      content:
        application/json:
          schema:
            type: array
      description: List of user object
      required: true
  responses:
    Unauthorized:
      description: Unauthorized access, invalid credentials was used
      headers:
        Location:
          schema:
            type: string
  headers:
    Rate-Limit-Limit:
      description: The number of allowed requests in the current period
      schema:
        type: integer

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
