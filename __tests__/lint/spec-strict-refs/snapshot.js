
validating openapi.yaml...
[1] openapi.yaml:6:3 at #/info/$ref

Field $ref is not expected here.

4 |     description: Default server
5 | info:
6 |   $ref: './info.yaml'
  |   ^^^^
7 | paths:
8 |   /pet:

Error was generated by the spec-strict-refs rule.


[2] openapi.yaml:20:19 at #/paths/~1pet/get/responses/200/content/application~1json/schema/properties/$ref

Field $ref is not expected here.

18 | type: object
19 | properties:
20 |   $ref: './props.yaml'
   |   ^^^^
21 |   name:
22 |     type: string

Error was generated by the spec-strict-refs rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 2 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

