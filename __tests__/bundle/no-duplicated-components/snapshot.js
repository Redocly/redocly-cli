openapi: 3.1.0
paths:
  /path:
    get:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Test'
components:
  schemas:
    Test:
      type: object

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
