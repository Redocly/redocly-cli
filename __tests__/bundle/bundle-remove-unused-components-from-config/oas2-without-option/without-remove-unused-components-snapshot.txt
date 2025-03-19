swagger: '2.0'
host: api.instagram.com
paths:
  /locations/{location-id}:
    post:
      responses:
        '401':
          schema:
            $ref: '#/definitions/ref'
definitions:
  MediaListResponse:
    properties:
      data:
        description: List of media entries
    type: object
  ref:
    type: string
parameters:
  AccountId:
    description: The account ID
    in: path
    name: accountId
    required: true
    type: string
responses:
  Data:
    properties:
      created_time:
        description: Caption creation UNIX timestamp
        type: string
    type: object
securityDefinitions:
  api_key:
    in: query
    name: access_token
    type: apiKey

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
