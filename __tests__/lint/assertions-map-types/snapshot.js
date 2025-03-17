
validating openapi.yaml...
[1] openapi.yaml:12:7 at #/servers/0/variables/Port

rule/serverVariableMap failed because the ServerVariablesMap didn't meet the assertions: "Port" should use flatcase

10 | - url: http://petstore.swagger.io:{Port}/v1
11 |   variables: # ServerVariablesMap
12 |     Port:
   |     ^^^^
13 |       enum:
14 |         - '8443'

Error was generated by the rule/serverVariableMap rule.


[2] openapi.yaml:29:15 at #/paths/~1pets/get/responses/200/headers/x-next

rule/headerMap failed because the HeadersMap x-next didn't meet the assertions: Should be not defined

27 | headers: # HeadersMap
28 |   x-next:
29 |     description: A link to the next page of responses
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
30 |     schema:
   |     ^^^^^^^
31 |       type: string
   |       ^^^^^^^^^^^^
32 | content:
33 |   application/json:

Error was generated by the rule/headerMap rule.


[3] openapi.yaml:35:17 at #/paths/~1pets/get/responses/200/content/application~1json/encoding/historyMetadata

rule/encodingMap failed because the EncodingMap didn't meet the assertions: "historyMetadata" should use kebab-case

33 |   application/json:
34 |     encoding: # EncodingMap
35 |       historyMetadata:
   |       ^^^^^^^^^^^^^^^
36 |         contentType: application/json; charset=utf-8
37 | links: # LinksMap

Error was generated by the rule/encodingMap rule.


[4] openapi.yaml:38:13 at #/paths/~1pets/get/responses/200/links/address

rule/linkMap failed because the LinksMap didn't meet the assertions: "address" should match a regex /^pet/

36 |         contentType: application/json; charset=utf-8
37 | links: # LinksMap
38 |   address:
   |   ^^^^^^^
39 |     operationId: getUserAddress
40 |     parameters:

Error was generated by the rule/linkMap rule.


[5] openapi.yaml:43:9 at #/paths/~1pets/get/callbacks/myCallback

rule/callbackMap failed because the CallbacksMap didn't meet the assertions: "myCallback" should use snake_case

41 |           userId: $request.path.id
42 | callbacks: # CallbacksMap
43 |   myCallback:
   |   ^^^^^^^^^^
44 |     '{$request.query.queryUrl}':
45 |       post:

Error was generated by the rule/callbackMap rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 5 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

