
validating openapi.yaml...
[1] openapi.yaml:12:9 at #/paths/~1ping/get/responses/400

Response \`4xx\` must have content-type \`application/problem+json\`.

10 | summary: example text
11 | responses:
12 |   '400':
   |   ^^^^^
13 |     description: example description
14 |     content:

Error was generated by the operation-4xx-problem-details-rfc7807 rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

