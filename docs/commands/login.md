# `login`

## Introduction

:::warning Note
Before proceeding with the command, you must [generate a personal API key](../../workflows/personal-api-keys.md) first.
:::

Use the `login` command to authenticate to the API registry.

When you log in, the `preview-docs` command will start a preview server using Redocly API reference docs with all of the premium features.

Also, you will be able to access your members-only (private) API definitions in the Redocly registry, and use the [`push` command](./push.md).

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any).

## Usage

```bash
openapi login [--help] [--verbose] [--version]

openapi login --verbose
```

## Options

option      | type      | required? | default | description
------------|:---------:|:---------:|:-------:|------------
`--help`    | `boolean` | no        | -       | Show help
`--verbose` | `boolean` | no        | -       | Include addtional output
`--version` | `boolean` | no        | -       | Show version number

## Examples

```bash Successful login
openapi login
  🔑 Copy your API key from https://app.redoc.ly/profile and paste it below:

  Logging in...
  Authorization confirmed. ✅
```

```bash Failed login
openapi login
  🔑 Copy your API key from https://app.redoc.ly/profile and paste it below:

  Logging in...
  Authorization failed. Please check if you entered a valid API key.
```