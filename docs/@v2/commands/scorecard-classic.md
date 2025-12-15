# `scorecard-classic`

## Introduction

The `scorecard-classic` command evaluates your API descriptions against quality standards defined in your Redocly project's scorecard configuration.
Use this command to validate API quality and track compliance with organizational governance standards across multiple severity levels.

{% admonition type="info" name="Note" %}
The `scorecard-classic` command requires a scorecard configuration in your Redocly project. You can configure this in your project settings or by providing a `--project-url` flag. Learn more about [configuring scorecards](https://redocly.com/docs/realm/config/scorecard).
{% /admonition %}

## Usage

```bash
redocly scorecard-classic <api> --project-url=<url>
redocly scorecard-classic <api> --config=<path>
redocly scorecard-classic <api> --format=json
redocly scorecard-classic <api> --target-level=<level>
redocly scorecard-classic <api> --verbose
```

## Options

| Option         | Type    | Description                                                                                                                                                                                          |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api            | string  | Path to the API description filename or alias that you want to evaluate. See [the API section](#specify-api) for more details.                                                                       |
| --config       | string  | Specify path to the [configuration file](#use-alternative-configuration-file).                                                                                                                       |
| --format       | string  | Format for the output.<br />**Possible values:** `stylish`, `json`. Default value is `stylish`.                                                                                                      |
| --help         | boolean | Show help.                                                                                                                                                                                           |
| --project-url  | string  | URL to the project scorecard configuration. Required if not configured in the Redocly configuration file. Example: `https://app.cloud.redocly.com/org/my-org/projects/my-project/scorecard-classic`. |
| --target-level | string  | Target scorecard level to achieve. The command validates that the API meets this level and all preceding levels without errors. Exits with an error if the target level is not achieved.             |
| --verbose, -v  | boolean | Run the command in verbose mode to display additional information during execution.                                                                                                                  |

## Examples

### Specify API

You can use the `scorecard-classic` command with an OpenAPI description file path or an API alias defined in your Redocly configuration file.

```bash
redocly scorecard-classic openapi/openapi.yaml --project-url=https://app.cloud.redocly.com/org/my-org/projects/my-project/scorecard-classic
```

In this example, `scorecard-classic` evaluates the specified API description against the scorecard rules defined in the provided project URL.

### Use alternative configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory.
Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly scorecard-classic openapi/openapi.yaml --config=./another/directory/redocly.yaml
```

### Configure scorecard in redocly.yaml

You can configure the scorecard project URL in your Redocly configuration file to avoid passing it as a command-line argument:

```yaml
scorecard:
  fromProjectUrl: https://app.cloud.redocly.com/org/my-org/projects/my-project/scorecard-classic

apis:
  core@v1:
    root: ./openapi/api-description.json
```

With this configuration, you can run the command without the `--project-url` flag:

```bash
redocly scorecard-classic core@v1
```

### Use JSON output format

To generate machine-readable output suitable for CI/CD pipelines or further processing, use the JSON format:

```bash
redocly scorecard-classic openapi/openapi.yaml --format=json
```

The JSON output is grouped by scorecard level and includes:

- version information
- achieved scorecard level
- summary of errors and warnings for each level
- rule ID and documentation link (for built-in rules)
- severity level (error or warning)
- location information (file path, line/column range, and JSON pointer)
- descriptive message about the violation

### Validate against a target level

Use the `--target-level` option to ensure your API meets a specific quality level. The command validates that your API satisfies the target level and all preceding levels without errors:

```bash
redocly scorecard-classic openapi/openapi.yaml --target-level=Gold
```

If the API doesn't meet the target level, the command:

- displays which level was actually achieved
- shows all validation issues preventing the target level from being met
- exits with a non-zero exit code (useful for CI/CD pipelines)

This is particularly useful in CI/CD pipelines to enforce minimum quality standards before deployment.

### Run in verbose mode

For troubleshooting or detailed insights into the scorecard evaluation process, enable verbose mode:

```bash
redocly scorecard-classic openapi/openapi.yaml --verbose
```

Verbose mode displays additional information such as:

- project URL being used
- authentication status
- detailed logging of the evaluation process

## Authentication

The `scorecard-classic` command requires authentication to access your project's scorecard configuration.
You can authenticate in one of two ways:

### Using API key (recommended for CI/CD)

Set the `REDOCLY_AUTHORIZATION` environment variable with your API key:

```bash
export REDOCLY_AUTHORIZATION=your-api-key-here
redocly scorecard-classic openapi/openapi.yaml
```

### Interactive login

If no API key is provided, the command prompts you to log in interactively:

```bash
redocly scorecard-classic openapi/openapi.yaml
```

The CLI opens a browser window for you to authenticate with your Redocly account.

## Scorecard results

The scorecard evaluation categorizes issues into multiple levels based on your project's configuration.
Each issue is associated with a specific scorecard level, allowing you to prioritize improvements.

The command displays the achieved scorecard level, which is the highest level your API meets without errors.
The achieved level is shown in both stylish and JSON output formats.

When all checks pass, the command displays a success message:

```text
 ☑️  Achieved Level: Gold

✅ No issues found for openapi/openapi.yaml. Your API meets all scorecard requirements.
```

When issues are found, the output shows:

- the achieved scorecard level
- the rule that was violated
- the scorecard level of the rule
- the location in the API description where the issue occurs
- a descriptive message explaining the violation

If a `--target-level` is specified and not achieved, the command displays an error message and exits with a non-zero code.

## Related commands

- [`lint`](./lint.md) - Standard linting for API descriptions with pass/fail results
- [`bundle`](./bundle.md) - Bundle multi-file API descriptions into a single file
- [`stats`](./stats.md) - Display statistics about your API description structure

## Resources

- [API governance documentation](../api-standards.md)
- [Redocly configuration guide](../configuration/index.md)
- [Custom rules and plugins](../custom-plugins/index.md)
