// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`webpack-bundle test lint check 1`] = `

validating ./openapi.yaml...
[1] openapi.yaml:47:9 at #/paths/~1pets/get/responses/400

Response \`4xx\` must have content-type \`application/problem+json\`.

45 |       schema:
46 |         $ref: '#/components/schemas/Pets'
47 | '400':
   | ^^^^^
48 |   description: An error response
49 | default:

Error was generated by the operation-4xx-problem-details-rfc7807 rule.


[2] openapi.yaml:63:9 at #/paths/~1pets/post/responses/400

Response \`4xx\` must have content-type \`application/problem+json\`.

61 | '204':
62 |   description: Null response
63 | '400':
   | ^^^^^
64 |   description: An error response
65 | default:

Error was generated by the operation-4xx-problem-details-rfc7807 rule.


[3] openapi.yaml:91:9 at #/paths/~1pets~1{pet_id}/get/responses/400

Response \`4xx\` must have content-type \`application/problem+json\`.

89 |       schema:
90 |         $ref: '#/components/schemas/Pets'
91 | '400':
   | ^^^^^
92 |   description: An error response
93 | default:

Error was generated by the operation-4xx-problem-details-rfc7807 rule.


./openapi.yaml: validated in <test>ms

❌ Validation failed with 3 errors.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.


`;
