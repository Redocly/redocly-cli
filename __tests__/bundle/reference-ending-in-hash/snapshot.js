openapi: 3.0.3
paths:
  /pets/{petId}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet: {}

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.
