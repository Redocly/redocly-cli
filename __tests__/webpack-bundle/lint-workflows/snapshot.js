// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`webpack-bundle test lint-workflows 1`] = `
{
  "totals": {
    "errors": 3,
    "warnings": 0,
    "ignored": 0
  },
  "version": "<version>",
  "problems": [
    {
      "ruleId": "operation-4xx-problem-details-rfc7807",
      "severity": "error",
      "message": "Response \`4xx\` must have content-type \`application/problem+json\`.",
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1pets/get/responses/400",
          "reportOnKey": true
        }
      ],
      "suggest": []
    },
    {
      "ruleId": "operation-4xx-problem-details-rfc7807",
      "severity": "error",
      "message": "Response \`4xx\` must have content-type \`application/problem+json\`.",
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1pets/post/responses/400",
          "reportOnKey": true
        }
      ],
      "suggest": []
    },
    {
      "ruleId": "operation-4xx-problem-details-rfc7807",
      "severity": "error",
      "message": "Response \`4xx\` must have content-type \`application/problem+json\`.",
      "location": [
        {
          "source": {
            "ref": "openapi.yaml"
          },
          "pointer": "#/paths/~1pets~1{pet_id}/get/responses/400",
          "reportOnKey": true
        }
      ],
      "suggest": []
    }
  ]
}
validating ./openapi.yaml...
./openapi.yaml: validated in <test>ms

❌ Validation failed with 3 errors.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.


`;
