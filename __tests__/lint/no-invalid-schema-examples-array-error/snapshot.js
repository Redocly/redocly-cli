// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint no-invalid-schema-examples-array-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:33:28 at #/paths/~1my_post/post/requestBody/content/application~1json/schema/properties/my_list/example

Example value must conform to the schema: type must be array.

31 |             items:
32 |               type: string
33 |             example: test
   |                      ^^^^
34 | responses:
35 |   '200':

referenced from openapi.yaml:29:19 at #/paths/~1my_post/post/requestBody/content/application~1json/schema/properties/my_list 

Error was generated by the no-invalid-schema-examples rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.


`;
