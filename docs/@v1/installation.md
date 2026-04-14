# Install Redocly CLI

Choose the most appropriate installation method for your needs:

- [Install locally, using `npm`](#install-locally) to make the `redocly` command available on your system.
- [Use `npx` to get the tool at runtime](#use-the-command-at-runtime) rather than installing it.
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
