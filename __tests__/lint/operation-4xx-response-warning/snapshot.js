// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint operation-4xx-response-warning 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:11:7 at #/paths/~1ping/get/responses

Operation must have at least one \`4XX\` response.

 9 | operationId: gitPing
10 | summary: example text
11 | responses:
   | ^^^^^^^^^
12 |   '200':
13 |     description: example description

Warning was generated by the operation-4xx-response rule.


/openapi.yaml: validated in <test>ms

Woohoo! Your OpenAPI description is valid. 🎉
You have 1 warning.


`;
