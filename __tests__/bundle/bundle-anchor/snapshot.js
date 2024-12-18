// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle-anchor 1`] = `
openapi: 3.1.0
paths:
  /test-api:
    get:
      responses:
        '200':
          description: success
          content:
            application/json:
              schema:
                $defs:
                  main_data:
                    $anchor: main_data
                    type: object
                    properties:
                      foo:
                        type: string
                type: object
                oneOf:
                  - properties:
                      wrapper:
                        $ref: '#main_data'
                  - $ref: '#main_data'
              example:
                foo: TEST
components: {}

bundling test.yaml...
📦 Created a bundle for test.yaml at stdout <test>ms.

`;
