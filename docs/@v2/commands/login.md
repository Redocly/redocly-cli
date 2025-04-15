# `login`

## Introduction

Use the `login` command to authenticate and use premium features.

## Usage

```bash
redocly login [--help] [--version]

redocly login --residency https://api.example.com
```

Note that logging in with **Reunite** API does not allow you to use the `push` command without an API key.

## Options

| Option          | Type    | Description                                                                                                                                                              |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| --config        | string  | Specify the path to the [configuration file](../configuration/index.md).                                                                                                 |
| --help          | boolean | Display help.                                                                                                                                                            |
| --residency, -r | string  | Specify the application's residency. The supported values are: `us`, `eu`, or a full URL. The `eu` region is limited to enterprise customers. The default value is `us`. |
| --version       | boolean | Show version number.                                                                                                                                                     |

## Examples

### View successful login message

A confirmation message is displayed with a successful login:

<pre>
redocly login
  Attempting to automatically open the SSO authorization page in your default browser.
  If the browser does not open or you wish to use a different device to authorize this request, open the following URL:

  https://auth.cloud.redocly.com/device-login

  Then enter the code:

  123456

  ✅ Logged in
</pre>
