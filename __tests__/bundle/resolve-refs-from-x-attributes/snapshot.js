// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle resolve-refs-from-x-attributes 1`] = `
openapi: 3.0.3
info:
  title: foo
  version: 1
  x-attributes:
    - $ref: external.yaml#/Test1
      resolved:
        name: test 1
  test-attributes:
    - $ref: external.yaml#/Test2
      resolved:
        name: test 2
components: {}

Woohoo! Your OpenAPI definitions are valid. 🎉

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at stdout <test>ms.

`;
