
validating openapi.yaml...
[1] openapi.yaml:20:16 at #/paths/~1pet~1findByStatus/get/summary

Operation summary should have at least 10 chars length

Did you mean:
  - Suggestion 1
  - Suggestion 2

18 | get:
19 |   operationId: example
20 |   summary: summary example
   |            ^^^^^^^^^^^^^^^
21 |   tags:
22 |     - foo

Error was generated by the rule/path-item-suggest rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

