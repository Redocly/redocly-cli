# @redocly/respect-core

## 0.12.0

### Minor Changes

- 47f2c39da7: Added support for the `QUERY` HTTP method, a new safe method with request body defined in [The HTTP QUERY Method specification](https://httpwg.org/http-extensions/draft-ietf-httpbis-safe-method-w-body.html).

### Patch Changes

- 16d4ccbe09: Updated version of the `@redocly/openapi-core` dependency to `1.28.3`.
- 40acc30481: Added support for floating-point numbers in Runtime Expressions. You can now use decimal numbers (like 3.14) in your expressions for validation and comparison operations. For example: `$response.body#/price == 3.14` or `$response.body#/value > 2.5`.

## 0.11.2

### Patch Changes

- 20aece6542: Updated version of the `@redocly/openapi-core` dependency to `1.28.2`.

## 0.11.1

### Patch Changes

- 0bce955e60: Improved error messages when source description files (OpenAPI or Arazzo) cannot be found at the specified paths.

## 0.11.0

### Minor Changes

- d403545209: Added configuration options to customize severity levels for checks. You can now set each check type to `error`, `warn`, or `off`, depending on your needs.

## 0.10.3

### Patch Changes

- 673dc80022: Enhanced Runtime Expression handler to support accessing response body data through the `outputs` syntax. You can now reference either specific parts of the response body or the entire body when working with output properties.

## 0.10.2

### Patch Changes

- ad4047544b: Removed support for `in: body` parameters due to Arazzo specification updates.

## 0.10.1

### Patch Changes

- ad2038e764: Removed deprecated `$message` variable from Runtime Expression context.
  This variable was previously used for AsyncAPI support but is no longer needed in the current Arazzo specification.

## 0.10.0

### Minor Changes

- e8bcd3e0c5: - Added mTLS (Mutual TLS) support that enables certificate-based mutual authentication for secure API endpoint access in your workflows.

## 0.9.1

### Patch Changes

- 128d6e8fa4: - Improved HTTP request handling by migrating from `node-fetch` to `undici` package, providing better performance and native HTTP/2 support.

## 0.9.0

### Minor Changes

- e80a68de80: Added support for `in: body` parameters, enabling request body data to be set through individual parameters. This support provides a more granular way to define request body content alongside the existing `requestBody` field, and allows for better reusability of common body parameters across steps.

## 0.8.0

### Minor Changes

- 975c728885: Added support for `end` type actions.
  When a workflow step has an `end` action, the workflow finishes and the context returns to the caller with applicable outputs.

### Patch Changes

- 698f536b5c: Updated version of the `@redocly/openapi-core` dependency to `1.26.1`.

## 0.7.31

### Patch Changes

- 7cd087a963: Added the `server` input Respect parameter so users can use it to override the server URL for each source description inside `sourceDescriptions`.

## 0.7.30

### Patch Changes

- f76b4a1ead: Made headers case-insensitive in runtime expressions.

## 0.7.29

### Patch Changes

- 266c7f2afc: Fixed a typo in the Ajv error message.

## 0.7.28

### Patch Changes

- eb6f81e9bb: Improved response validation by adding a default check to ensure the content type is defined in the description for the corresponding status code.
- 39baac3a33: Added a log entry of the duration of each workflow execution to the JSON output file.
- 2bdaa2b95f: Limited the context of `$steps` to have access only to individual step `outputs`.

## 0.7.27

### Patch Changes

- 1bc00e4fab: Changed JSON output results structure so that if it contains sensitive information, that information is masked.

## 0.7.26

### Patch Changes

- a24888e143: Removed the `x-expect` extension.

## 0.7.25

### Patch Changes

- 98365e2b57: Calculated response time of each workflow's step and displayed in output.

## 0.7.24

### Patch Changes

- ffef283ad6: Added a `--json-output` CLI option.
  Using this option with a Respect `run` command saves the logs to a JSON file.

## 0.7.23

### Patch Changes

- e480913066: Changed logout command error handling. This prevents a potentially misleading error about a missing file from displaying.

## 0.7.22

### Patch Changes

- f58dcd53c5: Added validation of expressions at runtime according to the rules of Arazzo ABNF syntax.

## 0.7.21

### Patch Changes

- aeb04cf514: Renamed `headers` to `header` in the runtime expression context to align with the Arazzo specification.
- aeb04cf514: Made `successCriteria` source context to be aligned with the Arazzo runtime expressions.
- aeb04cf514: Added calculation of accept header based on OpenAPI description.

## 0.7.20

### Patch Changes

- 0ca5b3d742: Removed the `type:none` sourceDescriptions Arazzo extension.

## 0.7.19

### Patch Changes

- 9e9ddadacd: Removed the `x-inherit` extension.
- 5a24cae01d: Changed the `x-operation` extension in Arazzo, enabling users to make requests with this extension without an API description file.

## 0.7.18

### Patch Changes

- 3782979bb7: Removed the `x-parameters` extension.
- 7e5ff91872: Removed the `x-inputs` extension.

## 0.7.17

### Patch Changes

- bc731fc937: Removed `x-assert` extension.

## 0.7.16

### Patch Changes

- b85222cbea: Changed the schema check step to fail when `x-operation` doesn't exist in an OpenAPI description.

## 0.7.15

### Patch Changes

- 7bf2b08fb8: Improved error message format by adding clarifying details.

## 0.7.14

### Patch Changes

- e9dd91ffd7: Enabled the resolution of `serverUrl`s when a description file contains multiple `sourceDescriptions` and uses `operationPath` syntax.

## 0.7.13

### Patch Changes

- 7556afc3d7: Added masking of request/response secrets in verbose logs when the secrets are described in available OpenAPI description schemas.

## 0.7.12

### Patch Changes

- b91a1c1d11: Added reusable object support to allow referencing objects within the components section from inside a step or workflow.

## 0.7.11

### Patch Changes

- 29e51a927b: Fixed an issue where Respect didn’t resolve references inside the external OpenAPI description.

## 0.7.10

### Patch Changes

- 53836adf96: Updated the behavior of the `x-serverUrl` extension so that it overrides the server URL value for `operationPath` even when there is only one sourceDescription.
- 4f260a3780: Improved verbose logs to mask information about inputs with `password` format.

## 0.7.9

### Patch Changes

- f050e5a53e: Improved the residency login failure message to display the connection URL.

## 0.7.8

### Patch Changes

- 9db53ec9ec: Apply additional validation rules: 'no-criteria-xpath' and 'no-actions-type-end'.

## 0.7.7

### Patch Changes

- cdbed7a5bd: Removed CLI telemetry.

## 0.7.6

### Patch Changes

- d6153cc46b: Environment variables from your `.env` file are now accessible using the `$inputs.env` context, making it easier to use configuration values in your workflows.
- d6153cc46b: Added top-level `x-inputs` extention to apply inputs to each workflow in the spec.

## 0.7.5

### Patch Changes

- 5ac0191194: Fixed workflows run delay caused by sending telemetry.

## 0.7.4

### Patch Changes

- e97765475e: Fixed an issue where the auto-generated description path was invalid when Arazzo and OpenAPI files were located in different folders.

## 0.7.3

### Patch Changes

- d5992f9909: If a path to a description file in `SourceDescriptions` is invalid, the application returns an error message.

## 0.7.2

### Patch Changes

- 79c2db9b7d: Added error handling for the `residency` parameter and device login.

## 0.7.1

### Patch Changes

- 101f5ea4ad: Add support for `successActions` and `failureActions` for workflows.

## 0.7.0

### Minor Changes

- a752b85ebb: feat: Migrated Respect syntax to use Arazzo Specification.
