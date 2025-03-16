// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle with long description description should not be in folded mode 1`] = `
openapi: 3.1.0
info:
  version: 1.0.0
  title: Example.com
  termsOfService: https://example.com/terms/
  contact:
    email: contact@example.com
    url: http://example.com/contact
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  description: |
    first line loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong
    second line exists
security: []
components: {}

bundling test.yaml...
📦 Created a bundle for test.yaml at stdout <test>ms.

`;
