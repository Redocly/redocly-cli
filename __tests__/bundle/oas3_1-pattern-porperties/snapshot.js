// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle oas3_1-pattern-porperties 1`] = `
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

`;
