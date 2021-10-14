// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle lint format bundle lint: should be formatted by format: stylish 1`] = `
openapi: 3.1.0
servers:
  - url: https://api.example.com/v1
info:
  title: Title
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html
  description: Description
  version: 1.0.0
paths:
  /my_post:
    post:
      operationId: my_post
      summary: my_post
      requestBody:
        content:
          application/json: null
components: {}

openapi.yaml:
  20:11  error    spec  Expected type \`MediaType\` (object) but got \`null\`

❌ Validation failed with 1 error.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at stdout <test>ms.

`;
