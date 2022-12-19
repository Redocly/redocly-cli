// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle primitive-types 1`] = `
openapi: 3.1.0
servers:
  - url: https://api.example.com/v1
security: []
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
          application/json:
            examples:
              primitive types:
                value:
                  emptyValue: null
                  multiString: multi string without quotes
                  spaces in keys: spaces in keys
                  numberString: '0123456789'
                  number: 1000
                  decimal: 12.34
                  numberWithLeadingZero: 127
                  boolean: true
                  date: '2020-01-01'
                  array:
                    - 1
                    - 2
                  object:
                    key1: 1
                    key2: 2
components: {}

Woohoo! Your OpenAPI definitions are valid. 🎉

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at stdout <test>ms.

`;
