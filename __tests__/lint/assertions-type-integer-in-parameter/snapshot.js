
validating openapi.yaml...
[1] openapi.yaml:26:19 at #/paths/~1pet~1findByStatus/get/parameters/0/schema/type

rule/no-type-integer-in-parameter failed because the Schema type didn't meet the assertions: "integer" should be one of the predefined values

24 |     example: en-US
25 |     schema:
26 |       type: integer
   |             ^^^^^^^
27 | responses:
28 |   '200':

Error was generated by the rule/no-type-integer-in-parameter rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

