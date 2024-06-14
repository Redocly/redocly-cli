# `login`

## Introduction

Use the `login` command to authenticate to the API registry.

When you log in, the `preview-docs` command starts a preview server using Redocly API reference docs with all of the premium features. Users who are not logged in see a Redoc community edition version of their documentation.

Also, you can access your members-only (private) API descriptions in the Redocly registry, and use the [`push`](./push.md) command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any).

## Usage

{% admonition type="warning" name="Note" %}
Go ahead and [generate a personal API key](https://redocly.com/docs/settings/personal-api-keys/); this key is needed to log in.
{% /admonition %}

```bash
redocly login [--help] [--verbose] [--version]

redocly login --verbose
```

## Options

| Option       | Type    | Description                                                                                                                                     |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| --config     | string  | Specify path to the [config file](../configuration/index.md).                                                                                   |
| --help       | boolean | Show help.                                                                                                                                      |
| --region, -r | string  | Specify which region to use when logging in. Supported values: `us`, `eu`. Read more about [configuring the region](../configuration/index.md). |
| --verbose    | boolean | Include additional output.                                                                                                                      |
| --version    | boolean | Show version number.                                                                                                                            |

## Examples

{% tabs %}
{% tab label="Successful login" %}

```bash
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization confirmed. ✅
```

{% /tab  %}
{% tab label="Failed login" %}

```bash
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization failed. Please check if you entered a valid API key.
```

{% /tab  %}
{% /tabs  %}
