// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint example-schema-type-array-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:34:21 at #/paths/~1my_post/post/requestBody/content/application~1json/schema/properties/my_list/example

Expected type \`array\` but got \`string\`.

32 |               type: string
33 |             example:
34 |               test
   |               ^^^^
35 | responses:
36 |   '200':

referenced from openapi.yaml:29:19

Error was generated by the schema-example-type rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run with \`--generate-ignore-file\` to add all problems to ignore file.


`;
