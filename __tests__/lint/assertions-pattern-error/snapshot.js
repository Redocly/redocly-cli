// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint assertions-pattern-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:20:16 at #/paths/~1pet~1findByStatus/get/summary

summary-pattern assertion failed because the Operation summary didn't meet the assertions: 
- "summary example" should match a regex /test/
- "summary example" should not match a regex /summary/

18 | get:
19 |   operationId: example
20 |   summary: summary example
   |            ^^^^^^^^^^^^^^^
21 |   tags:
22 |     - foo

Error was generated by the summary-pattern assertion rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.


`;
