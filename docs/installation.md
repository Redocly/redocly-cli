# Install Redocly CLI

Choose the most appropriate installation method for your needs:

* [Install locally, using `npm` or `yarn`](#install-globally) to make the `redocly` command available on your system.
* [Use `npx` to get the tool at runtime](#use-npx-at-runtime) rather than installing it.
* The command is also [available via Docker](#docker) if you'd prefer to use it that way.

## Install globally

:::success Tip
Make sure you have the newest version of `npm`/`yarn` before you begin.
:::

```shell npm
npm i -g @redocly/cli@latest
```

```shell yarn
yarn global add @redocly/cli
```

Running `redocly --version` confirms that the installation was successful, and the currently-installed version of the tool.

## Use `npx` at runtime

[npx](https://docs.npmjs.com/cli/v9/commands/npx/) is npm's package runner. It installs and runs a command without installing it globally. You might use this where you can't install a new command, or in a CI context where the command is only used a handful of times.

```shell Command
npx @redocly/cli <command> [options]
```

```shell Example with lint command
npx @redocly/cli@latest lint petstore.yaml
```

## <a id="docker"></a>Run commands inside Docker

Redocly CLI is available as a pre-built Docker image in [Docker Hub](https://hub.docker.com/r/redocly/cli) and [GitHub Packages](https://github.com/Redocly/redocly-cli/pkgs/container/redocly-cli).

If you have [Docker](https://docs.docker.com/get-docker/) installed, pull the image with the following command:

```shell Docker Hub
docker pull redocly/cli
```

```shell GitHub Packages
docker pull ghcr.io/redocly/redocly-cli
```

To give a Docker container access to your OpenAPI definition files, you need to mount the containing directory as a volume. Assuming the definition is in the current working directory, the command to use is:

```shell Example with lint command
docker run --rm -v $PWD:/spec redocly/cli lint petstore.yaml
```

## Next steps

- Set up [autocomplete for Redocly CLI](./guides/autocomplete.md).
- Check the full list of [Redocly CLI commands](./commands/index.md) available.

