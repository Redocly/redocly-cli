// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle info-description-override 1`] = `
openapi: 3.0.0
info:
  title: Example OpenAPI 3 definition.
  version: 1.0.0
  description: |
    This is a test API description.

    # Heading test

    Body [test](#) content.
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  contact:
    name: qa
    url: https://swagger.io/specification/#definitions
    email: email@redoc.ly
servers:
  - url: //petstore.swagger.io/v2
    description: Default server
paths:
  /pet/findByStatus:
    get:
      operationId: example
      summary: summary example
      responses:
        '200':
          description: example description
components: {}

[WARNING] "max-problems" option is deprecated and will be removed in the next major release. 

bundling ./main.yaml...
📦 Created a bundle for ./main.yaml at stdout <test>ms.

`;
