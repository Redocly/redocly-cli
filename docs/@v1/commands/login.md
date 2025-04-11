# `login`

## Introduction

Use the `login` command to authenticate to the API registry.

When you log in, the [`preview-docs`](./preview-docs.md) command starts a preview server using [Redocly API reference docs](https://redocly.com/reference/) with all of the premium features. Users who are not logged in see a [Redoc community edition](https://redocly.com/redoc/) version of their documentation.

After logging in, you can also access your members-only (private) API descriptions in the Redocly registry, and use the [`push`](./push.md) command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any).

## Usage

{% admonition type="warning" name="Note" %}
To log in, a personal API key is required. See [generate a personal API key](https://redocly.com/docs/settings/personal-api-keys/).
{% /admonition %}

```bash
redocly login [--help] [--verbose] [--version]

redocly login --verbose
```

To authenticate using **Reunite** API, use the `--next` option.

```bash
redocly login --next
```

Note that logging in with **Reunite** API does not allow you to use the `push` command.

## Options

| Option                    | Type    | Description                                                                                                                                                  |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| --config                  | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                         |
| --help                    | boolean | Show help.                                                                                                                                                   |
| --residency, --region, -r | string  | Specify the application's residency. Supported values: `us`, `eu`, or a full URL. The `eu` region is limited to enterprise customers. Default value is `us`. |
| --verbose                 | boolean | Display additional output.                                                                                                                                   |
| --version                 | boolean | Show version number.                                                                                                                                         |
| --next                    | boolean | Authenticate through Reunite API.                                                                                                                            |

## Examples

### View successful login message

A confirmation message is displayed with a successful login:

<pre>
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization confirmed. ✅
</pre>

### View failed login message

An error message is displayed with a failed login:

<pre>
redocly login
  🔑 Copy your API key from https://app.redocly.com/profile and paste it below:

  Logging in...
  Authorization failed. Please check if you entered a valid API key.
</pre>
