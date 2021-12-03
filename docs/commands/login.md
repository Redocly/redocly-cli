# `login`

## Introduction

:::warning Note
Before proceeding with the command, [generate a personal API key](../../settings/personal-api-keys.md).
:::

Use the `login` command to authenticate to the API registry.

When you log in, the `preview-docs` command will start a preview server using Redocly API reference docs with all of the premium features.

Also, you will be able to access your members-only (private) API definitions in the Redocly registry, and use the [`push`](./push.md) command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any).

## Region
The are two regions: `us`, `eu` you can login with.

region | domain      
-----|:---------
`us` | api.redoc.ly
`eu` | api.eu.redocly.com

How to use a domain by region:
- specify REDOCLY_DOMAIN env
- `--region` option
- specify `region` property on top level in config file: `.redocly.yaml` or `.redocly.yml`

Also, you are able to be logged in to two regions at the same time.


## Usage

```bash
openapi login [--help] [--verbose] [--version]

openapi login --verbose
```

## Options

Option      | Type      | Required  | Default | Description
------------|:---------:|:---------:|:-------:|------------
`--help`    | `boolean` | no        | -       | Show help
`--verbose` | `boolean` | no        | -       | Include additional output
`--version` | `boolean` | no        | -       | Show version number
`--region,-r`|`string`  | no        | `us`    | Provide a region <br />Possible values: `us`, `eu`

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
