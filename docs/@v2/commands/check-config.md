# `check-config`

## Introduction

Use the `check-config` command to check that the content in a Redocly configuration file is valid and in the expected format.
Adding this check before using the configuration file with other commands can catch any problems at an early stage.
This command uses the same mechanism as our API linting to match a file against an expected data structure.

## Usage

```bash
redocly check-config
redocly check-config [--config=<path>]
```

## Options

| Option        | Type   | Description                                                                                                                  |
| ------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| --config      | string | Specify path to the [configuration file](#use-alternative-configuration-file).                                               |
| --lint-config | string | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`. Default value is `error`. |

## Examples

### Use default location for configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory.

```bash
redocly check-config
```

### Use alternative configuration file

Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly check-config --config=./another/directory/config.yaml
```
