// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint info-license-url-missing-warning 1`] = `

validating /openapi.yaml...
[1] openapi.yaml:5:3 at #/info/license/url

License object should contain \`url\` field.

3 | title: Example OpenAPI 3 definition.
4 | version: 1.0
5 | license:
  | ^^^^^^^
6 |   name: Apache 2.0
7 |

Warning was generated by the info-license-url rule.


/openapi.yaml: validated in <test>ms

Woohoo! Your OpenAPI description is valid. 🎉
You have 1 warning.


`;
