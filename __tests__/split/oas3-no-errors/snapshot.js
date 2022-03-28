// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E split openapi with no errors 1`] = `

type: object
required:
  - id
  - name
properties:
  id:
    type: integer
    format: int64
  name:
    type: string
  tag:
    type: string
type: array
items:
  $ref: ./Pet.yaml
type: object
required:
  - code
  - message
properties:
  code:
    type: integer
    format: int32
  message:
    type: string
get:
  summary: List all pets
  operationId: listPets
  tags:
    - pets
  parameters:
    - name: limit
      in: query
      description: How many items to return at one time (max 100)
      required: false
      schema:
        type: integer
        format: int32
  responses:
    '200':
      description: A paged array of pets
      headers:
        x-next:
          description: A link to the next page of responses
          schema:
            type: string
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Pets'
    default:
      description: unexpected error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
post:
  summary: Create a pet
  operationId: createPets
  tags:
    - pets
  responses:
    '201':
      description: Null response
    default:
      description: unexpected error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
get:
  summary: Info for a specific pet
  operationId: showPetById
  tags:
    - pets
  parameters:
    - name: petId
      in: path
      required: true
      description: The id of the pet to retrieve
      schema:
        type: string
  responses:
    '200':
      description: Expected response to a valid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Pet'
    default:
      description: unexpected error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
openapi: 3.0.0
info:
  version: 1.0.0
  title: Swagger Petstore
  license:
    name: MIT
servers:
  - url: http://petstore.swagger.io/v1
paths:
  /pets:
    $ref: paths/pets.yaml
  /pets/{petId}:
    $ref: paths/pets_{petId}.yaml
🪓 Document: ../../../__tests__/split/oas3-no-errors/openapi.yaml is successfully split
    and all related files are saved to the directory: output 

../../../__tests__/split/oas3-no-errors/openapi.yaml: split processed in <test>ms


`;
