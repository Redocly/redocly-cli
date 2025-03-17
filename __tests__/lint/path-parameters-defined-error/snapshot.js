
validating openapi.yaml...
[1] openapi.yaml:11:17 at #/paths/~1user~1{id}/get/parameters/0/name

Path parameter \`test\` is not used in the path \`/user/{id}\`.

 9 | parameters:
10 |   - in: path
11 |     name: test
   |           ^^^^
12 |     description: User id
13 |     required: true

Error was generated by the path-parameters-defined rule.


[2] openapi.yaml:9:7 at #/paths/~1user~1{id}/get/parameters

The operation does not define the path parameter \`{id}\` expected by path \`/user/{id}\`.

 7 | '/user/{id}':
 8 |   get:
 9 |     parameters:
   |     ^^^^^^^^^^
10 |       - in: path
11 |         name: test

Error was generated by the path-parameters-defined rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 2 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

