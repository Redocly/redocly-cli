
validating openapi.yaml...
[1] openapi.yaml:1:1 at #/openapi

Servers must be present.

1 | openapi: 3.1.0
  | ^^^^^^^
2 | info:
3 |   title: Example OpenAPI 3 definition.

Error was generated by the no-empty-servers rule.


[2] openapi.yaml:2:1 at #/info/contact

Info object should contain \`contact\` field.

1 | openapi: 3.1.0
2 | info:
  | ^^^^
3 |   title: Example OpenAPI 3 definition.
4 |   version: 1.0.0

Error was generated by the info-contact rule.


[3] openapi.yaml:2:1 at #/info

Info object should contain \`license\` field.

1 | openapi: 3.1.0
2 | info:
  | ^^^^
3 |   title: Example OpenAPI 3 definition.
4 |   version: 1.0.0

Error was generated by the info-license rule.


[4] openapi.yaml:9:5 at #/paths/~1ping~1{id}~1{test}/get/operationId

Operation object should contain \`operationId\` field.

 7 | paths:
 8 |   '/ping/{id}/{test}':
 9 |     get:
   |     ^^^
10 |       parameters:
11 |         - in: path

Error was generated by the operation-operationId rule.


[5] openapi.yaml:9:5 at #/paths/~1ping~1{id}~1{test}/get

Operation tags should be defined

 7 | paths:
 8 |   '/ping/{id}/{test}':
 9 |     get:
   |     ^^^
10 |       parameters:
11 |         - in: path

Error was generated by the operation-tag-defined rule.


[6] openapi.yaml:9:5 at #/paths/~1ping~1{id}~1{test}/get/summary

Operation object should contain \`summary\` field.

 7 | paths:
 8 |   '/ping/{id}/{test}':
 9 |     get:
   |     ^^^
10 |       parameters:
11 |         - in: path

Error was generated by the operation-summary rule.


[7] openapi.yaml:9:5 at #/paths/~1ping~1{id}~1{test}/get/description

Operation object should contain \`description\` field.

 7 | paths:
 8 |   '/ping/{id}/{test}':
 9 |     get:
   |     ^^^
10 |       parameters:
11 |         - in: path

Error was generated by the operation-description rule.


[8] openapi.yaml:12:17 at #/paths/~1ping~1{id}~1{test}/get/parameters/0/name

Path parameter \`test_id\` is not used in the path \`/ping/{id}/{test}\`.

10 | parameters:
11 |   - in: path
12 |     name: test_id
   |           ^^^^^^^
13 |     description: User id
14 |     required: true

Error was generated by the path-parameters-defined rule.


[9] openapi.yaml:12:17 at #/paths/~1ping~1{id}~1{test}/get/parameters/0/name

Path parameter \`test_id\` is not used in the path \`/ping/{id}/{test}\`.

10 | parameters:
11 |   - in: path
12 |     name: test_id
   |           ^^^^^^^
13 |     description: User id
14 |     required: true

Error was generated by the path-params-defined rule.


[10] openapi.yaml:17:7 at #/paths/~1ping~1{id}~1{test}/get/responses

Operation must have at least one \`4XX\` response.

15 |     schema:
16 |       type: string
17 | responses:
   | ^^^^^^^^^
18 |   '200':
19 |     description: example description

Error was generated by the operation-4xx-response rule.


[11] openapi.yaml:10:7 at #/paths/~1ping~1{id}~1{test}/get/parameters

The operation does not define the path parameter \`{id}\` expected by path \`/ping/{id}/{test}\`.

 8 | '/ping/{id}/{test}':
 9 |   get:
10 |     parameters:
   |     ^^^^^^^^^^
11 |       - in: path
12 |         name: test_id

Error was generated by the path-parameters-defined rule.


[12] openapi.yaml:10:7 at #/paths/~1ping~1{id}~1{test}/get/parameters

The operation does not define the path parameter \`{test}\` expected by path \`/ping/{id}/{test}\`.

 8 | '/ping/{id}/{test}':
 9 |   get:
10 |     parameters:
   |     ^^^^^^^^^^
11 |       - in: path
12 |         name: test_id

Error was generated by the path-parameters-defined rule.


[13] openapi.yaml:10:7 at #/paths/~1ping~1{id}~1{test}/get/parameters

The operation does not define the path parameter \`{id}\` expected by path \`/ping/{id}/{test}\`.

 8 | '/ping/{id}/{test}':
 9 |   get:
10 |     parameters:
   |     ^^^^^^^^^^
11 |       - in: path
12 |         name: test_id

Error was generated by the path-params-defined rule.


[14] openapi.yaml:10:7 at #/paths/~1ping~1{id}~1{test}/get/parameters

The operation does not define the path parameter \`{test}\` expected by path \`/ping/{id}/{test}\`.

 8 | '/ping/{id}/{test}':
 9 |   get:
10 |     parameters:
   |     ^^^^^^^^^^
11 |       - in: path
12 |         name: test_id

Error was generated by the path-params-defined rule.


[15] openapi.yaml:8:3 at #/paths/~1ping~1{id}~1{test}

path segment \`ping\` should be plural.

 6 |
 7 | paths:
 8 |   '/ping/{id}/{test}':
   |   ^^^^^^^^^^^^^^^^^^^
 9 |     get:
10 |       parameters:

Error was generated by the path-segment-plural rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 15 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

