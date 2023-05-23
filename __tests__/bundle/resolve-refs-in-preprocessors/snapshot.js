// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle should not resolve $refs in preprocessors by default 1`] = `

[1] openapi.yaml:17:9 at #/paths/~1items/get/responses/400

Can't resolve $ref

15 |     summary: Items
16 |     responses: 
17 |       200: 
   |       ^^^^^
18 |         $ref: "./successful-request.response.yaml"
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
19 |         
20 | /status:

Error was generated by the no-unresolved-refs rule.


[2] nested/status.yaml:6:9 at #/get/responses/400

Can't resolve $ref

4 |   summary: Status
5 |   responses: 
6 |     200: 
  |     ^^^^^
7 |       $ref: ../successful-request.response.yaml          
  |       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
8 |       
9 | 

Error was generated by the no-unresolved-refs rule.


❌ Validation failed with 2 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

bundling openapi.yaml...
[1] openapi.yaml:17:9 at #/paths/~1items/get/responses/400

Can't resolve $ref

15 |     summary: Items
16 |     responses: 
17 |       200: 
   |       ^^^^^
18 |         $ref: "./successful-request.response.yaml"
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
19 |         
20 | /status:

Error was generated by the bundler rule.


[2] nested/status.yaml:6:9 at #/get/responses/400

Can't resolve $ref

4 |   summary: Status
5 |   responses: 
6 |     200: 
  |     ^^^^^
7 |       $ref: ../successful-request.response.yaml          
  |       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
8 |       
9 | 

Error was generated by the bundler rule.


❌ Errors encountered while bundling openapi.yaml: bundle not created (use --force to ignore errors).

`;

exports[`E2E bundle should resolve $refs in preprocessors with flag 1`] = `
openapi: 3.0.1
info:
  license:
    name: PROPRIETARY
    url: http://localhost:8080
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:8080
security: []
paths:
  /items:
    get:
      operationId: getItems
      summary: Items
      responses:
        '200':
          $ref: '#/components/responses/successful-request.response'
        '400':
          $ref: '#/components/responses/bad-request-error.response'
  /status:
    get:
      operationId: getStatus
      summary: Status
      responses:
        '200':
          $ref: '#/components/responses/successful-request.response'
        '400':
          $ref: '#/components/responses/bad-request-error.response'
components:
  responses:
    successful-request.response:
      description: Success
      content:
        application/json:
          schema:
            type: array
            items:
              type: string
    bad-request-error.response:
      description: Failure
      content:
        application/json+problem:
          schema: null

[1] bad-request-error.response.yaml:4:5 at #/content/application~1json+problem/schema

Expected type \`Schema\` (object) but got \`null\`

2 | content: 
3 |   application/json+problem:
4 |     schema: 
  |     ^^^^^^^
5 |

Error was generated by the spec rule.


❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.

`;
