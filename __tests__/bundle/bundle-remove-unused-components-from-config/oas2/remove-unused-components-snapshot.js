// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle with option in config: remove-unused-components oas2: should remove unused components 1`] = `
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
  ref:
    type: string

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
🧹 Removed 4 unused components.

`;
