openapi: 3.1.0
info:
  description: some description
  title: Example OpenAPI 3 definition.
  version: 1.0.0
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  contact:
    name: qa
    url: https://swagger.io/specification/#definitions
    email: email@redocly.com
servers:
  - url: //petstore.swagger.io/v2
    description: Default server
tags:
  - name: pet
    description: |
      Create a **pat** tag description.
  - name: store
    description: |
      Create a **store** tag description.
  - name: user
    description: Operations about user
  - name: pet_model
    x-displayName: The Pet Model
    description: |
      <SchemaDefinition schemaRef="#/components/schemas/Pet" />
  - name: store_model
    x-displayName: The Order Model
    description: |
      <SchemaDefinition schemaRef="#/components/schemas/Order" exampleRef="#/components/examples/Order" showReadOnly={true} showWriteOnly={true} />
paths:
  /pet/findByStatus:
    get:
      operationId: example
      summary: summary example
      responses:
        '200':
          description: example description
components: {}

bundling main.yaml...
📦 Created a bundle for main.yaml at stdout <test>ms.
