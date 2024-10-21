// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle info-override 1`] = `
openapi: 3.0.0
info:
  title: Updated title
  version: 1.0.0
  description: some description
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  contact:
    name: qa
    url: https://swagger.io/specification/#definitions
    email: email@redocly.com
  x-vendor: custom extension
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

bundling ./main.yaml...
📦 Created a bundle for ./main.yaml at stdout <test>ms.

`;
