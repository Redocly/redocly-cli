// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'invalid-config--lint-config-error', option: 'error' } 1`] = `

[1] .redocly.yaml:5:3 at #/rules/context

Property \`context\` is not expected here.

3 |     root: ./openapi.yaml
4 | rules:
5 |   context: null
  |   ^^^^^^^
6 |

Error was generated by the configuration spec rule.


❌ Your config has 1 error.
validating ../__fixtures__/valid-openapi.yaml...
../__fixtures__/valid-openapi.yaml: validated in <test>ms

Woohoo! Your OpenAPI description is valid. 🎉

[WARNING] Unused rules found in .redocly.yaml: context.
Check the spelling and verify the added plugin prefix.

`;
