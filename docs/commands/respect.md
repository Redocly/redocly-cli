---
slug:
  - /docs/cli/commands/respect
  - /docs/respect/commands/respect
rbac:
  authenticated: read
---
# `respect`

Use this command to execute API tests described in an Arazzo file.
In addition to the Arazzo specification, `respect` supports specification extensions for API testing: `x-operation` and `x-serverUrl`.

## Usage

```sh
npx @redocly/cli respect <your-test-file | multiple files | files bash query> [-w | --workflow] [-s | --skip] [-v | --verbose] [-i | --input]
```

## Options

{% table %}
* Option {% width="20%" %}
* Type {% width="15%" %}
* Description
---
* -w, --workflow
* [string]
* Workflow names from the test file to run.
  For example, the following command runs "first-flow" and "second-flow" workflows from the "test-file.yaml" test file: `npx @redocly/cli respect test-file.yaml --workflow first-flow second-flow`
  {% admonition type="warning" %}
  The `--workflow` option can't be used with `--skip`.
  {% /admonition %}
---
* -s, --skip
* [string]
* Workflow names from the test file to skip.
  For example, the following command skips the "first-flow" workflow from the "test-file.yaml" test file: `npx @redocly/cli respect test-file.yaml --skip first-flow`
  {% admonition type="warning" %}
  Warning: the `--skip` option can't be used with `--workflow`.
  {% /admonition %}
---
* -v, --verbose
* boolean
* Runs the command in verbose mode to help with troubleshooting issues.
  For example, the following command runs all workflows from the "test-file.yaml" test file in verbose mode: `npx @redocly/cli respect test-file.yaml --verbose`
---
* --har-output
* string
* Path for the `har` file for saving logs.
  For example, the following command runs all workflows from the "test-file.yaml" test file and saves the logs to the "logs.har" file: `npx @redocly/cli respect test-file.yaml --har-output='logs.har'`
---
* --json-output
* string
* Path for the 'json` file for saving logs.
  For example, the following command runs all workflows from the "test-file.yaml" test file and saves the logs to the "logs.json" file: `npx @redocly/cli respect test-file.yaml --json-output='logs.json'`
---
* --input
* string
* Input parameters with values that are mapped to the workflow inputs description.
  For example, the following command maps the "userEmail" and "userPassword" inputs and values to all workflows in the "test.yaml" test file: `npx @redocly/cli respect test.yaml --input userEmail=name@redocly.com --input userPassword=12345`.
  You can also use an environment variable to set the input, as in the following example: `REDOCLY_CLI_RESPECT_INPUT='userEmail=name@redocly.com,userPassword=12345' npm run cli respect test.yaml`

  You can even include nested values, as in the following example command that maps the "nestedKey" input and value to all workflows in the "test-file.yaml" test file: `npx @redocly/cli respect test-file.yaml --input '{"key": "value", "nested": {"nestedKey": "nestedValue"}}'`.
  You can also use an environment variable to set the input, as in the following example: `REDOCLY_CLI_RESPECT_INPUT='{"key":"value","nested":{"nestedKey":"nestedValue"}}' npx @redocly/cli respect test-file.yaml`
---
* --server
* string
* Server overrides for the `sourceDescriptions` object.
  For example, the following command runs all workflows from the "test-file.yaml" test file and instead of using the server listed in the API description, uses the server at "https://test.com": `npx @redocly/cli respect test-file.yaml --server test=https://test.com`

  You can also pass the server overrides as an environment variable, as in the following example:
  `REDOCLY_CLI_RESPECT_SERVER="test=https://test.com"`
---
* --residency
* string
* Residency location of Reunite application to use if `login` command was not run before.
  Default: `us`.
  You can also pass the residency as an environment variable, as in the following example:
  `REDOCLY_CLI_RESPECT_RESIDENCY='eu'`
{% /table %}

## Examples

- Run the tests by running the following command: `npx @redocly/cli respect <your-test-file>`.
- Run multiple tests by running the following command: `npx @redocly/cli respect <your-test-file-one> <your-test-file-two>`.
- Run multiple tests by running the following command with bash selector : `npx @redocly/cli respect $(find ./path-to-tests-folder -type f -name '*.arazzo.yaml')`.

**Example output**

```bash
Running workflow warp.arazzo.yaml / missionLostInvention

  ✓ POST /anchors - step setAnchorToCurrentTime
    ✓ status code check (Response code 201 matches one of description codes: [201, 409])
    ✓ content-type check
    ✓ schema check

  ✓ POST /timelines - step createTimelineTo1889
    ✓ status code check (Response code 201 matches one of description codes: [201])
    ✓ content-type check
    ✓ schema check

  ✓ POST /travels - step travelTo1889
    ✓ status code check (Response code 200 matches one of description codes: [200, 400])
    ✓ content-type check
    ✓ schema check

  ✓ POST /items - step findAndRegisterBlueprint
    ✓ status code check (Response code 200 matches one of description codes: [200, 409])
    ✓ content-type check
    ✓ schema check

  ✓ POST /paradox-checks - step avoidParadox
    ✓ success criteria check
    ✓ success criteria check
    ✓ status code check (Response code 200 matches one of description codes: [200, 400])
    ✓ content-type check
    ✓ schema check

  ✓ POST /travels - step returnToPresent
    ✓ status code check (Response code 200 matches one of description codes: [200, 400])
    ✓ content-type check
    ✓ schema check


  Summary for warp.arazzo.yaml
  
  Workflows: 1 passed, 1 total
  Steps: 6 passed, 6 total
  Checks: 20 passed, 20 total
  Time: 1060ms


┌──────────────────────────────────────────────────────────┬────────────┬─────────┬─────────┬──────────┬─────────┐
│ Filename                                                 │ Workflows  │ Passed  │ Failed  │ Warnings │ Skipped │
├──────────────────────────────────────────────────────────┼────────────┼─────────┼─────────┼──────────┼─────────┤
│ ✓ warp.arazzo.yaml                                       │ 1          │ 1       │ -       │ -        │ -       │
└──────────────────────────────────────────────────────────┴────────────┴─────────┴─────────┴──────────┴─────────┘
```

## Resources

<!-- - Learn more about using mTLS with Respect in [Use mTLS](/docs/respect/guides/mtls-cli).
- Follow steps to test API sequences in [Test a sequence of API calls](/docs/respect/guides/test-api-sequences).
- Learn what Respect is and how you can use it to test API in the [Respect](/docs/respect) concept document.
- [Learn Arazzo](/learn/arazzo/what-is-arazzo). -->
