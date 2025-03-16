// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E miscellaneous decorate with a decorator from a plugin 1`] = `
openapi: 3.1.0
info:
  title: Test
  x-stats:
    test: 1
paths: {}
components:
  securitySchemes:
    OpenID:
      type: openIdConnect
      openIdConnectUrl: https://example.com/missing-well-known-configuration

Deprecated plugin format detected: test-plugin
bundling openapi.yaml...
📦 Created a bundle for openapi.yaml at stdout <test>ms.

`;
