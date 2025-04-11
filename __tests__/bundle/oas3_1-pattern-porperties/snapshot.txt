openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths:
  /asset/{assetId}:
    get:
      operationId: assetGetAsset
      summary: Fetch an asset
      requestBody:
        content:
          application/json:
            schema:
              type: object
              patternProperties:
                .*:
                  $ref: '#/components/schemas/object'
components:
  schemas:
    object:
      type: object

bundling test.yaml...
📦 Created a bundle for test.yaml at stdout <test>ms.
