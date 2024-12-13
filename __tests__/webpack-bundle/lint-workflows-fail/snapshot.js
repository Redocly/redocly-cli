// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`webpack-bundle test lint-workflows-fail 1`] = `
{
  "totals": {
    "errors": 1,
    "warnings": 1,
    "ignored": 0
  },
  "version": "<version>",
  "problems": [
    {
      "ruleId": "operation-summary",
      "severity": "error",
      "message": "Operation object should contain \`summary\` field.",
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1pets~1{pet_id}/get/summary",
          "reportOnKey": true
        }
      ],
      "suggest": []
    },
    {
      "ruleId": "operation-operationId",
      "severity": "warn",
      "message": "Operation object should contain \`operationId\` field.",
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1pets~1{pet_id}/get/operationId",
          "reportOnKey": true
        }
      ],
      "suggest": []
    }
  ]
}
validating openapi.yaml...
openapi.yaml: validated in <test>ms

❌ Validation failed with 1 error and 1 warning.
run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.


`;
