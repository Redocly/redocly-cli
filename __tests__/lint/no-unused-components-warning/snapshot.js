// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint no-unused-components-warning 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:18:5 at #/components/schemas/Category

Component: "Category" is never used.

16 | components:
17 |   schemas:
18 |     Category:
   |     ^^^^^^^^
19 |       type: object
20 |       properties:

Warning was generated by the no-unused-components rule.


/openapi.yaml: validated in <test>ms

Woohoo! Your API description is valid. 🎉
You have 1 warning.


`;
