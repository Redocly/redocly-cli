// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint wrong-required-type 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:12:21 at #/components/schemas/BugDemo/properties/id/required

Expected type \`array\` but got \`boolean\`.

10 | id:
11 |   type: string
12 |   required: true
   |             ^^^^
13 |

Error was generated by the spec rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.


`;
