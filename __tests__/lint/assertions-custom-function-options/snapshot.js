// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint assertions-custom-function-options 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:36:16 at #/paths/~1pet~1findByStatus/post/summary

Operation summary should start with an active verb

34 | post:
35 |   operationId: example-post
36 |   summary: summary looooong
   |            ^^^^^^^^^^^^^^^^
37 |   tags:
38 |     - foo

Error was generated by the operation-summary-length assertion rule.


[2] openapi.yaml:36:16 at #/paths/~1pet~1findByStatus/post/summary

Operation summary should start with an active verb

34 | post:
35 |   operationId: example-post
36 |   summary: summary looooong
   |            ^^^^^^^^^^^^^^^^
37 |   tags:
38 |     - foo

Error was generated by the operation-summary-length assertion rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 2 errors.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.


`;