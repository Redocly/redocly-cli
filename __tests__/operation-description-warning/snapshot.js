// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E operation-description-warning 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:8:5 at #/paths/~1ping/get/description

Operation object should contain \`description\` field.

 6 | paths:
 7 |   '/ping':
 8 |     get:
   |     ^^^
 9 |       operationId: gitPing
10 |       summary: example text

Warning was generated by the operation-description rule.


/openapi.yaml: validated in <test>ms

Woohoo! Your OpenAPI definition is valid. 🎉
You have 1 warning.


`;
