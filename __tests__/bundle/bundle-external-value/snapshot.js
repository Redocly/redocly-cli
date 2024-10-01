// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle-external-value 1`] = `
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
  description: OpenAPI description with external example
security: []
paths:
  /:
    post:
      summary: Test request externalValue with relative reference in examples
      requestBody:
        content:
          application/xml:
            schema:
              type: object
            examples:
              mergeRequest:
                summary: Merge request example
                value:
                  foo: bar
                  key: value
components: {}

bundling ./test.yaml...
📦 Created a bundle for ./test.yaml at stdout <test>ms.

`;
