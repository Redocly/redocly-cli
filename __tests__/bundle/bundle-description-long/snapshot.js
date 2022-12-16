// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle-description-long 1`] = `
openapi: 3.1.0
security: []
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
components: {}

test.yaml:
  1:1  error    no-empty-servers  Servers must be present.

❌ Validation failed with 1 error.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./test.yaml...
📦 Created a bundle for ./test.yaml at stdout <test>ms.

`;

exports[`E2E bundle with long description description should not be in folded mode 1`] = `
openapi: 3.1.0
security: []
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
components: {}

bundling test.yaml...
📦 Created a bundle for test.yaml at stdout <test>ms.

`;
