// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'invalid-config--no-option', option: null } 1`] = `

[1] .redocly.yaml:5:3 at #/rules/context

Property \`context\` is not expected here.

3 |     root: ./openapi.yaml
4 | rules:
5 |   context: null
  |   ^^^^^^^
6 |

Warning was generated by the configuration spec rule.


You have 1 warning.
validating ../__fixtures__/valid-openapi.yaml...
../__fixtures__/valid-openapi.yaml: validated in <test>ms

Woohoo! Your API description is valid. 🎉

[WARNING] Unused rules found in .redocly.yaml: context.
Check the spelling and verify the added plugin prefix.

`;
