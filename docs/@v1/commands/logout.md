# `logout`

## Introduction

Use the `logout` command to clear the API key from your device.
You may want to `logout` if you are using a shared work computer or want to [`login`](./login.md) with another API key.

## Usage

```bash
redocly logout [--help] [--version]

redocly logout --version
```

## Options

| Option    | Type    | Description          |
| --------- | ------- | -------------------- |
| --help    | boolean | Show help.           |
| --version | boolean | Show version number. |

## Examples

### View successful logout message

A confirmation message is displayed with a successful logout:

<pre>
redocly logout
Logged out from the Redocly account. ✋
</pre>
