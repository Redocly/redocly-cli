// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint assertions-enum-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:20:16 at #/paths/~1pet~1findByStatus/get/summary

Operation summary value should be among of predefined values

Did you mean:
  - test summary
  - test example

18 | get:
19 |   operationId: example
20 |   summary: summary example
   |            ^^^^^^^^^^^^^^^
21 |   tags:
22 |     - foo

Error was generated by the operation-summary-value assertion rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.


`;
