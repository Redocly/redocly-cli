# `login`

## Introduction

:::warning Note

Before proceeding with the command, [generate a personal API key](../../settings/personal-api-keys.md).

:::

Use the `login` command to authenticate to the API registry.

When you log in, the `preview-docs` command will start a preview server using Redocly API reference docs with all of the premium features.

Also, you will be able to access your members-only (private) API definitions in the Redocly registry, and use the [`push`](./push.md) command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any).


## Usage

```bash
redocly login [--help] [--verbose] [--version]

redocly login --verbose
```

## Options

Option | Type | Description
-- | -- | --
--help | boolean | Show help.
--region, -r | string | Specify which region to use when logging in. Supported values: `us`, `eu`. Read more about [configuring the region](../configuration/index.mdx).
--verbose | boolean | Include additional output.
--version | boolean | Show version number.

## Examples

```bash Successful login
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization confirmed. ✅
```

```bash Failed login
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization failed. Please check if you entered a valid API key.
```
