# `verify-config`

## Introduction

This is a dedicated command to lint a Redocly config file as the lint command does for an API description file to ensure the config file is valid.

## Usage

```bash
redocly verify-config
redocly verify-config [--config=<path>]
```

## Options

| Option                          | Type     | Description                                                                                                                  |
| ------------------------------- | -------- |------------------------------------------------------------------------------------------------------------------------------|
| --config                        | string   | Specify path to the [config file](#custom-configuration-file).                                                               |
| --lint-config                   | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`. Default value is `error`. |

## Examples

### Default configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory.

```bash
redocly verify-config
```

### Custom configuration file

Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly verify-config --config=./another/directory/config.yaml
```
