// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint operation-security-defined-warning 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:17:5 at #/security/0/app_id

There is no \`app_id\` security scheme defined.

15 |           description: example description
16 | security:
17 |   - app_id: []
   |     ^^^^^^
18 |

Warning was generated by the security-defined rule.


/openapi.yaml: validated in <test>ms

Woohoo! Your API description is valid. 🎉
You have 1 warning.


`;
