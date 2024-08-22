// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle resolve-refs-from-x-attributes 1`] = `
openapi: 3.0.3
info:
  title: foo
  version: 1
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html
  x-attributes:
    - $ref: external.yaml#/Test1
      resolved:
        name: test 1
  test-attributes:
    - $ref: external.yaml#/Test2
      resolved:
        name: test 2
components: {}

Deprecated plugin format detected: plugin
Deprecated plugin format detected: plugin
bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at stdout <test>ms.

`;
