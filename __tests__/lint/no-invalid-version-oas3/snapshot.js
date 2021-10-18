// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint no-invalid-version-oas3 1`] = `

validating /openapi.yaml...
Something went wrong when processing /home/runner/work/openapi-cli/openapi-cli/__tests__/lint/no-invalid-version-oas3/openapi.yaml:

  - Invalid OpenAPI version: 3.1 
.


/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/oas-types.js:25
        throw new Error(\`Invalid OpenAPI version: \${root.openapi} \\n\`);
              ^
Error: Invalid OpenAPI version: 3.1 

    at Object.detectOpenAPI (/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/oas-types.js:25:15)
    at /Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:47:40
    at Generator.next (<anonymous>)
    at /Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:8:71
    at new Promise (<anonymous>)
    at __awaiter (/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:4:12)
    at lintDocument (/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:44:12)
    at Object.<anonymous> (/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:31:16)
    at Generator.next (<anonymous>)
    at fulfilled (/Users/andriyl/Projects/Redocly/TEST/openapi-cli/packages/core/lib/lint.js:5:58)

`;
