// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[` 1`] = `

warning: different summary values in /GETUser/{userId}
warning: different description values in /GETUser/{userId}
openapi: 3.0.0
info:
  description: test
  version: 1.0.0
  title: Swagger Petstore
  termsOfService: http://swagger.io/terms/
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
servers:
  - url: http://localhost:8081
  - url: http://localhost:8080
paths:
  /GETUser/{userId}:
    summary: getUser
    description: getUser
    parameters:
      - name: param2
        in: header
      - name: param1
        in: header
        schema:
          description: string
    servers:
      - url: /test
      - url: /pets
        description: another description
      - url: /pet
        description: some description
    post:
      tags:
        - user
      description: Returns a single pet
      operationId: getUserById
      summary: get user info
      parameters:
        - name: userId
          in: path
          description: ID of pet to return
          required: true
          deprecated: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: oka
    get:
      tags:
        - pet
      summary: Find pet by ID
      description: Returns a single pet
      operationId: getPetById
      servers:
        - url: /pet
      parameters:
        - name: petId
          in: path
          description: ID of pet to return
          required: true
          deprecated: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: ok
        '400':
          description: bad request
tags:
  - name: user
    x-displayName: user
  - name: pet
    x-displayName: pet
x-tagGroups:
  - name: test
    tags:
      - user
  - name: pet
    tags:
      - pet
components: {}

openapi.yaml: join processed in <test>ms


`;
