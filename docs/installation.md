# Install Redocly CLI

Choose the most appropriate installation method for your needs:

* [Install locally, using `npm` or `yarn`](#install-globally) to make the `redocly` command available on your system.
* [Use `npx` to get the tool at runtime](#use-npx-at-runtime) rather than installing it.
* The command is also [available via Docker](#docker) if you'd prefer to use it that way.

## Install globally

{% admonition type="success" name="Tip" %}
Make sure you have the newest version of `npm`/`yarn` before you begin.
{% /admonition %}

{% tabs %}
{% tab label="npm" %}
```shell
npm i -g @redocly/cli@latest
```
{% /tab  %}
{% tab label="yarn" %}
```shell
yarn global add @redocly/cli
```
{% /tab  %}
{% /tabs  %}

Running `redocly --version` confirms that the installation was successful, and the currently-installed version of the tool.

## Use `npx` at runtime

[npx](https://docs.npmjs.com/cli/v9/commands/npx/) is npm's package runner. It installs and runs a command without installing it globally. You might use this where you can't install a new command, or in a CI context where the command is only used a handful of times.
{% tabs %}
{% tab label="Command" %}
```shell
npx @redocly/cli <command> [options]
```
{% /tab  %}
{% tab label="Example with lint command" %}
```shell
npx @redocly/cli@latest lint petstore.yaml
```
{% /tab  %}
{% /tabs  %}
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
docker run --rm -v $PWD:/spec redocly/cli lint petstore.yaml
```

## Next steps

- Set up [autocomplete for Redocly CLI](./guides/autocomplete.md).
- Check the full list of [Redocly CLI commands](./commands/index.md) available.

