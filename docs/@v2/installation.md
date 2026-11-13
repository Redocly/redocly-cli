# Install Redocly CLI

Choose the most appropriate installation method for your needs:

- [Install locally, using `npm`](#install-locally) to make the `redocly` command available on your system.
- [Use `npx` to get the tool at runtime](#use-the-command-at-runtime) rather than installing it.
- [Download a standalone binary](#standalone-binary) that runs without Node.js.
- The command is also [available through Docker](#docker).

## Install locally

Before you begin, make sure you have the newest version of `npm`.

To install Redocly CLI locally:

1. In your CLI, `cd` to your project's directory.
1. Enter the following command:

```bash
npm i @redocly/cli@latest
```

1. (Optional) Run `redocly --version` to confirm that the installation was successful and the currently-installed version of the tool.

## Use the command at runtime

[npx](https://docs.npmjs.com/cli/v9/commands/npx/) is `npm`'s package runner.
It installs and runs a command without installing it globally.

Use this approach where you can't install a new command, or in a CI context where the command is only used a handful of times.

To run Redocly CLI with `npx`:

- Replace `redocly` with `npx @redocly/cli@latest` to prepend Redocly CLI commands.

  ```bash
  npx @redocly/cli@latest <command> [options]
  ```

For example, to run `redocly lint` on a file named `openapi.yaml`, use the following command:

```bash
npx @redocly/cli@latest lint openapi.yaml
```

## <a id="standalone-binary"></a>Download a standalone binary

Every Redocly CLI release on the [GitHub releases page](https://github.com/Redocly/redocly-cli/releases) includes standalone binaries for Linux, macOS, and Windows.
A binary needs no Node.js or npm.
The `SHA256SUMS` file in the same release lists the SHA-256 checksum of each binary.

| System                                | File                        |
| ------------------------------------- | --------------------------- |
| Linux x64                             | `redocly-linux-x64`         |
| Linux arm64                           | `redocly-linux-arm64`       |
| Linux x64 with musl, such as Alpine   | `redocly-linux-x64-musl`    |
| Linux arm64 with musl, such as Alpine | `redocly-linux-arm64-musl`  |
| macOS with an Intel processor         | `redocly-darwin-x64`        |
| macOS with an Apple silicon processor | `redocly-darwin-arm64`      |
| Windows x64                           | `redocly-windows-x64.exe`   |
| Windows arm64                         | `redocly-windows-arm64.exe` |

To install a binary on Linux or macOS:

1. Download the binary for your system and the checksums file.
   Replace the version and the file name with the ones you need:

   ```bash
   VERSION=2.75.0
   FILE=redocly-linux-x64
   curl -fLO "https://github.com/Redocly/redocly-cli/releases/download/%40redocly%2Fcli%40$VERSION/$FILE"
   curl -fLO "https://github.com/Redocly/redocly-cli/releases/download/%40redocly%2Fcli%40$VERSION/SHA256SUMS"
   ```

1. Check the binary against its checksum:

   ```bash
   sha256sum --check --ignore-missing SHA256SUMS
   ```

   On macOS, use `shasum -a 256 --check --ignore-missing SHA256SUMS`.

1. Make the binary executable and move it to a folder on your `PATH`:

   ```bash
   chmod +x "$FILE"
   sudo mv "$FILE" /usr/local/bin/redocly
   ```

1. Run `redocly --version` to confirm the installation.

On Windows, download the `.exe` file and the `SHA256SUMS` file.
In PowerShell, run `Get-FileHash redocly-windows-x64.exe` and compare the hash with the line for the same file in `SHA256SUMS`.
Then rename the file to `redocly.exe` and add its folder to your `PATH`.

The macOS binaries are not notarized by Apple.
MacOS blocks binaries downloaded in a web browser.
Download the binary with the previously mentioned `curl` command, or remove the block with `xattr -d com.apple.quarantine <file>`.

The `preview`, `eject`, and `translate` commands download their product package from the npm registry and run it on the runtime built into the binary.
They use the registry configured in your `.npmrc` file.

## <a id="docker"></a>Run commands inside Docker

Redocly CLI is available as a pre-built Docker image in [Docker Hub](https://hub.docker.com/r/redocly/cli) and [GitHub Packages](https://github.com/Redocly/redocly-cli/pkgs/container/cli).

Before you begin, make sure you have Docker [installed](https://docs.docker.com/get-docker/).

To run Redocly CLI commands inside a docker container:

1. Pull the image:

{% tabs %}
{% tab label="Docker Hub" %}

```bash
docker pull redocly/cli
```

{% /tab  %}
{% tab label="GitHub Packages" %}

```bash
docker pull ghcr.io/redocly/cli
```

{% /tab  %}
{% /tabs  %}

1. To give a Docker container access to your OpenAPI description files, mount the containing directory as a volume:

```bash Example with lint command
docker run --rm -v $PWD:/spec redocly/cli lint openapi.yaml
```

This example assumes that the API description file is in your current working folder.

## Run CLI behind a proxy

To run the CLI tool behind a proxy, you can use the `HTTP_PROXY` and `HTTPS_PROXY` environment variables to configure the proxy settings.
These environment variables specify the proxy server for HTTP and HTTPS traffic, respectively.

### Set up Proxy Environment Variables

To set the proxy environment variables:

- Open a terminal and use the following command:

{% tabs %}
{% tab label="HTTP proxy" %}

```bash
export HTTP_PROXY=http://your-http-proxy-server:port
```

{% /tab  %}
{% tab label="HTTPS proxy" %}

```bash
export HTTPS_PROXY=https://your-https-proxy-server:port
```

{% /tab  %}
{% /tabs  %}

### Bypass proxy for specific hosts

Use the `NO_PROXY` environment variable to specify hosts that should be accessed directly, without going through the proxy.
The value is a comma-separated list of hostnames or domain suffixes:

- `localhost` — exact hostname match.
- `.example.com` — matches any subdomain of `example.com` (but not `example.com` itself).
- `example.com` — matches `example.com` and any subdomain such as `api.example.com`.
- `*` — bypasses the proxy for all requests.

### Use Environment Variables with CLI Commands

To directly include the proxy environment variables in a Redocly CLI command:

- Prepend the command with the environment variable and its value.

  For example:

  ```bash
  HTTPS_PROXY=https://your-https-proxy-server:port redocly lint --extends minimal openapi.yaml
  ```

## Next steps

- Set up [autocomplete for Redocly CLI](./guides/autocomplete.md).
- Check the full list of [Redocly CLI commands](./commands/index.md) available.
- Try things out with the [Museum Example API](https://github.com/Redocly/museum-openapi-example).
