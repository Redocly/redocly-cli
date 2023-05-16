// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint assertions-require-any-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:18:5 at #/paths/~1pet~1findByStatus/get

Operation must have one of properties defined: description or externalDocs

16 | paths:
17 |   /pet/findByStatus:
18 |     get:
   |     ^^^
19 |       operationId: example
20 |       summary: summary example

Error was generated by the operation-require-any-description-or-external assertion rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.


`;
