![@redocly/openapi-cli output screenshot](/media/openapi-cli.gif)

# Open API 3 CLI toolset

- [Open API 3 CLI toolset](#open-api-3-cli-toolset)
  - [Approach](#approach)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Configuration](#configuration)
  - [Bundling](#bundling)


## Approach
Unlike other OpenAPI validators @redocly/openapi-cli defines the possible type tree of a valid OpenAPI definition and then traverses it. This approach is very similar to how compilers work and gives major performance benefits over other approaches. Also, it allows to easily add custom or quite complex visitors. For now, they include validation rules and a bundler.

## Features

As for now, @redocly/openapi-cli supports such features:

- [x] Multifile validation. No need to bundle your file before using validator.
- [x] Configurable message levels for each rule. You can tailor your experience with @redocly/openapi-cli as you wish.
- [x] Lightning fast validation. Check 1 Mb file less than in one second.
- [x] Human readable error messages. Now with stacktrace and codeframes.
- [x] Intuitive suggestions for misspelled type names or references.
- [x] Easy to implement custom rules. Need something? Ask us or do it yourself.

## Installation

You can run the `@redocly/openapi-cli` either with `npx` or after installing it locally.

If using `npx`, you can just enter the following:

`npx @redocly/openapi-cli <command> [options]`

Otherwise, you can install the `@redocly/openapi-cli` with 

```npm i -g @redocly/openapi-cli```

or

```yarn global add @redocly/openapi-cli```

## Usage

Try to run `openapi -h` and if installation was successful, you'll see the usage information.

Currently, `@redocly/openapi-cli` supports only one command: `validate [options] <filePath>`. Given this command, it will load the given ruleset and traverse the definition via the `filePath` parameter.

Also, it accepts `[options]` which can be:
- `-s, --short` Reduce output to required minimun
- `-f, --no-frame` Print no codeframes with errors.
- `--config <path>`  Specify custom yaml or json config

In the section below, you can check about how one can provide settings for the `@redocly/openapi-cli`.

## Configuration

All of the following rules are configurable in terms of disabling or changing their severity. In order to update given rule, you should modify (or create) the `.openapi-cli.yaml` file in the directory from which you are going to run the validator.

Also, you can provide path to configuration file name other than `.openapi-cli.yaml` by using `--config` option when running the @redocly/openapi-cli.

If you are creating it from scratch, you might also want to enable/disable codeframe for the full output.

Below is the config, which is used by default:

```yaml
enableCodeframe: true
enbaleCustomRuleset: true
rules:
  bundler: off

  oas3-schema: on
  path-param-exists: on
  operation-2xx-response: on
  unique-parameter-names: on
  no-unused-schemas: on
  operation-operationId-unique: on
  path-declarations-must-exist: on

  api-servers: off
  license-url: off
  no-extra-fields: off
  operation-description: off
  operation-operationId: off
  operation-tags: off
  provide-contact: off
  servers-no-trailing-slash: off
```

Here is an example of a modified use `.openapi-cli.yaml` file:

```yaml
enableCodeframe: true,
rules:
  no-extra-fields: off,
  external-docs:
    url: off
  license-required:
    level: warning
  unique-parameter-names:
    level: warning
  no-unused-schemas: off
```

Check all the supported rules [here](RULES.md).

## Bundling

Also, you can enable bundling feature, which will bundle your Open API 3 definition into a single file. To do so, modify you config file so that `bundler` object in `rules` would look like following:

```yaml
rules:
  bundler:
    output: your-desired-filename.yml
```

Supported extensions for bundle files are `.json`, `.yml` and `.yaml`.

If the file specified as the bundlers output already exists, it will be overwritten.