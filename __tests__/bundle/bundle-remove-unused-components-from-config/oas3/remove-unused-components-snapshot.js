// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle with option in config: remove-unused-components oas3: should remove unused components 1`] = `
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
  schemas:
    ref:
      type: string

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
🧹 Removed 6 unused components.

`;
