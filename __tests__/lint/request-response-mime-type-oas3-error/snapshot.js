
validating openapi.yaml...
[1] openapi.yaml:25:11 at #/paths/~1store~1subscribe/post/requestBody/content/application~1xml

Mime type "application/xml" is not allowed

23 | requestBody:
24 |   content:
25 |     application/xml:
   |     ^^^^^^^^^^^^^^^
26 |       schema:
27 |         type: object

Error was generated by the request-mime-type rule.


[2] openapi.yaml:54:19 at #/paths/~1store~1subscribe/post/callbacks/orderInProgress/{$request.body#~1callbackUrl}?event={$request.body#~1eventName}/post/requestBody/content/application~1xml

Mime type "application/xml" is not allowed

52 | requestBody:
53 |   content:
54 |     application/xml:
   |     ^^^^^^^^^^^^^^^
55 |       schema:
56 |         type: object

Error was generated by the response-mime-type rule.


[3] openapi.yaml:65:21 at #/paths/~1store~1subscribe/post/callbacks/orderInProgress/{$request.body#~1callbackUrl}?event={$request.body#~1eventName}/post/responses/200/content/application~1xml

Mime type "application/xml" is not allowed

63 | description: Callback successfully processed and no retries will be performed
64 | content:
65 |   application/xml:
   |   ^^^^^^^^^^^^^^^
66 |     schema:
67 |       type: object

Error was generated by the request-mime-type rule.


[4] openapi.yaml:80:11 at #/x-webhooks/newPet/post/requestBody/content/application~1xml

Mime type "application/xml" is not allowed

78 | requestBody:
79 |   content:
80 |     application/xml:
   |     ^^^^^^^^^^^^^^^
81 |       schema:
82 |         type: object

Error was generated by the response-mime-type rule.


[5] openapi.yaml:92:13 at #/x-webhooks/newPet/post/responses/200/content/application~1xml

Mime type "application/xml" is not allowed

90 | description: Return a 200 status
91 | content:
92 |   application/xml:
   |   ^^^^^^^^^^^^^^^
93 |     schema:
94 |       type: object

Error was generated by the request-mime-type rule.


openapi.yaml: validated in <test>ms

❌ Validation failed with 5 errors.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

