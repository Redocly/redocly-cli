# Install Redocly CLI

Choose the most appropriate installation method for your needs:

- [Install locally, using `npm`](#install-globally) to make the `redocly` command available on your system.
- [Use `npx` to get the tool at runtime](#use-the-command-at-runtime) rather than installing it.
- The command is also [available via Docker](#docker) if you'd prefer to use it that way.

## Install globally

{% admonition type="success" name="Tip" %}
Make sure you have the newest version of `npm` before you begin.
{% /admonition %}

Install the tool with the following command:

```shell
npm i -g @redocly/cli@latest
```

Running `redocly --version` confirms that the installation was successful, and the currently-installed version of the tool.

## Use the command at runtime

[npx](https://docs.npmjs.com/cli/v9/commands/npx/) is npm's package runner. It installs and runs a command without installing it globally. You might use this where you can't install a new command, or in a CI context where the command is only used a handful of times.

To run Redocly CLI with `npx`, the command looks like the following example:

```shell
npx @redocly/cli@latest <command> [options]
```

For example, to run `redocly lint` on a file named `openapi.yaml`, use the following command:

```shell
npx @redocly/cli@latest lint openapi.yaml
```

Replace `redocly` with `npx @redocly/cli@latest` to prepend to other commands you see in documentation.

## <a id="docker"></a>Run commands inside Docker

Redocly CLI is available as a pre-built Docker image in [Docker Hub](https://hub.docker.com/r/redocly/cli) and [GitHub Packages](https://github.com/Redocly/redocly-cli/pkgs/container/cli).

Install [Docker](https://docs.docker.com/get-docker/) if you don't have it already, then pull the image with the following command:
{% tabs %}
{% tab label="Docker Hub" %}

```shell
docker pull redocly/cli
```

{% /tab  %}
{% tab label="GitHub Packages" %}

```shell
docker pull ghcr.io/redocly/cli
```

{% /tab  %}
{% /tabs  %}
To give a Docker container access to your OpenAPI description files, you need to mount the containing directory as a volume. Assuming the API description is in the current working directory, the command to use is:

```shell Example with lint command
docker run --rm -v $PWD:/spec redocly/cli lint openapi.yaml
```

## Run CLI behind a proxy

If you need to run the CLI tool behind a proxy, you can use the `HTTP_PROXY` and `HTTPS_PROXY` environment variables to configure the proxy settings. These environment variables are commonly used to specify the proxy server for HTTP and HTTPS traffic, respectively.

### Set up Proxy Environment Variables

Before running the CLI behind a proxy, make sure to set the appropriate proxy environment variables. Open a terminal and use the following commands:

```bash
# For HTTP proxy
export HTTP_PROXY=http://your-http-proxy-server:port

# For HTTPS proxy
export HTTPS_PROXY=https://your-https-proxy-server:port
```

### Use Environment Variables with CLI Commands

You can also directly include the proxy environment variables in the command itself. For example:

```bash
HTTPS_PROXY=https://your-https-proxy-server:port redocly lint --extends minimal openapi.yaml
```

## Next steps

- Set up [autocomplete for Redocly CLI](./guides/autocomplete.md).
- Check the full list of [Redocly CLI commands](./commands/index.md) available.
- Try things out with the [Museum Example API](https://github.com/Redocly/museum-openapi-example).
