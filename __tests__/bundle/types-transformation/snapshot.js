// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle types-transformation 1`] = `
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
          application/json:
            examples:
              primitive types:
                value:
                  emptyValue: null
                  string: string
                  multiString: multi string without quotes
                  spaces in keys: spaces in keys
                  numberString: '0123456789'
                  number: 123
                  decimal: 12.34
                  octal1: 127
                  octal2: 128
                  boolean1: true
                  boolean2: false
                  date: 2020-01-01
                  array:
                    - 1
                    - 2
                  object:
                    key1: 1
                    key2: 2
components: {}

Woohoo! Your OpenAPI definitions are valid. 🎉

bundling foo.yaml...
📦 Created a bundle for foo.yaml at stdout <test>ms.
Failed to resolve entrypoint definition at bar.yaml:

  - ENOENT: no such file or directory, open '/Users/yaroslav/Redocly/openapi-cli/__tests__/bundle/types-transformation/bar.yaml'.


`;
