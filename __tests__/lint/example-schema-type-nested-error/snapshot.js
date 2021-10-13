// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint example-schema-type-nested-error 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:54:20 at #/components/schemas/Test/properties/my_list/example

Expected type \`string\` but got \`number\`.

52 | my_list:
53 |   type: string
54 |   example: 50
   |            ^^
55 | nested:
56 |   allOf:

referenced from openapi.yaml:53:11

Error was generated by the schema-example-type rule.


[2] openapi.yaml:73:20 at #/components/schemas/Dog/properties/my_list/example

Expected type \`string\` but got \`number\`.

71 | my_list:
72 |   type: string
73 |   example: 32
   |            ^^
74 | nested:
75 |   allOf:

referenced from openapi.yaml:72:11

Error was generated by the schema-example-type rule.


[3] openapi.yaml:96:20 at #/components/schemas/Tag/properties/name/example

Expected type \`string\` but got \`number\`.

94 | description: Tag name
95 | type: string
96 | example: 35
   |          ^^
97 |

referenced from openapi.yaml:94:11

Error was generated by the schema-example-type rule.


[4] openapi.yaml:69:16 at #/components/schemas/Dog/example

Expected type \`object\` but got \`string\`.

67 | Dog:
68 |   type: object
69 |   example: test dog example
   |            ^^^^^^^^^^^^^^^^
70 |   properties:
71 |     my_list:

referenced from openapi.yaml:68:7

Error was generated by the schema-example-type rule.


[5] openapi.yaml:63:28 at #/components/schemas/Test/properties/nested/allOf/1/properties/huntingSkill/example

Expected type \`string\` but got \`number\`.

61 | huntingSkill:
62 |   type: string
63 |   example: 100
   |            ^^^
64 | nested_schema:
65 |   oneOf:

referenced from openapi.yaml:62:19

Error was generated by the schema-example-type rule.


[6] openapi.yaml:83:20 at #/components/schemas/Category/properties/id/example

Expected type \`number\` but got \`string\`.

81 |   type: number
82 |   description: Category ID
83 |   example: category example
   |            ^^^^^^^^^^^^^^^^
84 | ref_id:
85 |   allOf:

referenced from openapi.yaml:81:11

Error was generated by the schema-example-type rule.


[7] openapi.yaml:89:16 at #/components/schemas/Id/example

Expected type \`integer\` but got \`number\`.

87 | Id:
88 |   type: integer
89 |   example: 78.9
   |            ^^^^
90 | Tag:
91 |   type: object

referenced from openapi.yaml:88:7

Error was generated by the schema-example-type rule.


[8] openapi.yaml:59:24 at #/components/schemas/Test/properties/nested/allOf/1/example

Expected type \`object\` but got \`string\`.

57 | - $ref: '#/components/schemas/Dog'
58 | - type: object
59 |   example: dog
   |            ^^^
60 |   properties:
61 |     huntingSkill:

referenced from openapi.yaml:58:15

Error was generated by the schema-example-type rule.


[9] openapi.yaml:50:16 at #/components/schemas/Test/example

Expected type \`object\` but got \`string\`.

48 | Test:
49 |   type: object
50 |   example: test example
   |            ^^^^^^^^^^^^
51 |   properties:
52 |     my_list:

referenced from openapi.yaml:49:7

Error was generated by the schema-example-type rule.


[10] openapi.yaml:47:20 at #/components/schemas/ApiResponse/properties/code/example

Expected type \`integer\` but got \`number\`.

45 |       type: integer
46 |       format: int32
47 |       example: 23.1
   |                ^^^^
48 | Test:
49 |   type: object

referenced from openapi.yaml:45:11

Error was generated by the schema-example-type rule.


[11] openapi.yaml:42:16 at #/components/schemas/ApiResponse/example

Expected type \`object\` but got \`string\`.

40 | ApiResponse:
41 |   type: object
42 |   example: api response
   |            ^^^^^^^^^^^^
43 |   properties:
44 |     code:

referenced from openapi.yaml:41:7

Error was generated by the schema-example-type rule.


/openapi.yaml: validated in <test>ms

❌ Validation failed with 11 errors.
run with \`--generate-ignore-file\` to add all problems to ignore file.


`;
