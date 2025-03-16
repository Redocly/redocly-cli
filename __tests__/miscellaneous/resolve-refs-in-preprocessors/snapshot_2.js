// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E miscellaneous lint should resolve $refs in preprocessors 1`] = `

validating openapi.yaml...
[1] openapi.yaml:4:1 at #/info

Info object should contain \`license\` field.

2 | servers:
3 |   - url: http://redocly-example.com:8080
4 | info:
  | ^^^^
5 |   title: Test
6 |   version: 1.0.0

Warning was generated by the info-license rule.


openapi.yaml: validated in <test>ms

Woohoo! Your API description is valid. 🎉
You have 1 warning.


`;
