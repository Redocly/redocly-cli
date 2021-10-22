// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle info-description-override 1`] = `
openapi: 3.0.0
info:
  title: Example OpenAPI 3 definition.
  version: 1
  description: |
    title: My best work
    description: My best work description
  contact:
    name: qa
    url: https://swagger.io/specification/#definitions
    email: email@redoc.ly
paths:
  /pet/findByStatus:
    get:
      operationId: example
      summary: summary example
      responses:
        '200':
          description: example description
components: {}

main.yaml:
  1:1  error    no-empty-servers  Servers must be present.

< ... 2 more problems hidden > increase with \`--max-problems N\`
❌ Validation failed with 2 errors and 1 warning.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./main.yaml...
📦 Created a bundle for ./main.yaml at stdout <test>ms.

`;
