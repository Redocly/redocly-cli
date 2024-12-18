// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E miscellaneous apply a decorator to a specific api (when the api is specified as an alias) 1`] = `
openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths: {}
components:
  schemas:
    Unused:
      type: string

bundling nested/openapi/main.yaml...
📦 Created a bundle for nested/openapi/main.yaml at stdout <test>ms.

`;

exports[`E2E miscellaneous apply a decorator to a specific api (without specifying the api) 1`] = `
openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths: {}
components:
  schemas:
    Unused:
      type: string

bundling nested/openapi/main.yaml...
📦 Created a bundle for nested/openapi/main.yaml at stdout <test>ms.

`;
