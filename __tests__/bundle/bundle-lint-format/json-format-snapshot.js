// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle lint format bundle lint: should be formatted by format: json 1`] = `
{
  "totals": {
    "errors": 1,
    "warnings": 0,
    "ignored": 0
  },
  "version": "1.0.0-beta.72",
  "problems": [
    {
      "ruleId": "spec",
      "severity": "error",
      "message": "Expected type \`MediaType\` (object) but got \`null\`",
      "suggest": [],
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1my_post/post/requestBody/content/application~1json",
          "reportOnKey": false
        }
      ]
    }
  ]
}{
  "totals": {
    "errors": 0,
    "warnings": 0,
    "ignored": 0
  },
  "version": "1.0.0-beta.72",
  "problems": []
}
No configurations were defined in extends -- using built in recommended configuration by default.

❌ Validation failed with 1 error.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./openapi.yaml...
📦 Created a bundle for ./openapi.yaml at /tmp/null.yaml <test>ms.

`;
