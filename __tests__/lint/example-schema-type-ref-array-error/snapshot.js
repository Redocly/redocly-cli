// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint example-schema-type-ref-array-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:41:13 at #/components/schemas/Test/properties/my_list/example

Expected type \`array\` but got \`string\`.

39 |   type: string
40 | example:
41 |   test
   |   ^^^^
42 |

referenced from openapi.yaml:36:11

Error was generated by the schema-example-type rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.


`;
