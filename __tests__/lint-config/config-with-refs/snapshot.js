// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'config-with-refs', option: 'warn' } 1`] = `


Property 'theme' is only used in API Reference Docs and Redoc version 2.x or earlier.

[1] .redocly.yaml:7:1 at #/non-existing-root-property

Property \`non-existing-root-property\` is not expected here.

5 |       $ref: rules.yaml
6 |
7 | non-existing-root-property: Fail
  | ^^^^^^^^^^^^^^^^^^^^^^^^^^
8 |
9 | theme:

Warning was generated by the configuration spec rule.


[2] rules.yaml:2:1 at #/wrong-rule

Property \`wrong-rule\` is not expected here.

1 | info-contact: error
2 | wrong-rule: warn
  | ^^^^^^^^^^
3 |

referenced from .redocly.yaml:5:7 at #/apis/main/rules 

Warning was generated by the configuration spec rule.


[3] theme-openapi.yaml:4:17 at #/content/theme/logo/maxWidth

Expected type \`string\` but got \`integer\`.

2 | theme:
3 |   logo:
4 |     maxWidth: 100
  |               ^^^
5 |

Warning was generated by the configuration spec rule.


⚠️ Your config has 3 warnings.
⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/


`;
