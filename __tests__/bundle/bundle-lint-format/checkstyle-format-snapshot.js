// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle lint format bundle lint: should be formatted by format: checkstyle 1`] = `
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="openapi.yaml">
<error line="20" column="11" severity="error" message="Expected type \`MediaType\` (object) but got \`null\`" source="spec" />
</file>
</checkstyle>

[WARNING] "lint" option is deprecated and will be removed in a future release. 

[WARNING] "format" option is deprecated and will be removed in a future release. 

[WARNING] "max-problems" option is deprecated and will be removed in a future release. 

❌ Validation failed with 1 error.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at /tmp/null.yaml <test>ms.

`;
