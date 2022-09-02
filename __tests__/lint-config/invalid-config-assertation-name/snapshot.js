// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'invalid-config-assertation-name', option: 'error' } 1`] = `

[1] .redocly.yaml:7:5 at #/styleguide/rules/asset~1path-item-mutually-required

The field \`severity\` must be present on this level.

5 | extends: []
6 | rules:
7 |   asset/path-item-mutually-required:
  |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
8 |     context:
9 |       - type: PathItem

Error was generated by the configuration spec rule.


❌ Your config has 1 error.
validating ../__fixtures__/valid-openapi.yaml...
../__fixtures__/valid-openapi.yaml: validated in <test>ms

Woohoo! Your OpenAPI definition is valid. 🎉

[WARNING] Unused rules found in .redocly.yaml: asset/path-item-mutually-required.
Check the spelling and verify the added plugin prefix.

`;
