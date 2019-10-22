# OpenAPI 3 CLI toolset

OpenAPI 3 CLI toolbox with rich validation and bundling features.

![Travis (.org)](https://img.shields.io/travis/Redocly/openapi-cli)
![npm (scoped)](https://img.shields.io/npm/v/@redocly/openapi-cli)
![NPM](https://img.shields.io/npm/l/@redocly/openapi-cli)

![OpenAPI 3 CLI toolset](https://user-images.githubusercontent.com/24596796/67019141-dc517580-f104-11e9-811a-46135e8f2048.gif)

## Features

Currently, @redocly/openapi-cli supports these features:

- [x] Multifile validation. No need to bundle your file before validation.
- [x] Configurable message levels for each rule. You can tailor your experience with @redocly/openapi-cli as you wish.
- [x] Lightning-fast validation. Check 1 Mb file in less than one second.
- [x] Human-readable error messages. Now with stacktrace and codeframes.
- [x] Intuitive suggestions for misspelled types or references.
- [x] Easy to implement custom rules. Need something? Ask us or do it yourself.
- [x] Bundle a multifile definition into a single file.

## Approach

Unlike other OpenAPI validators, @redocly/openapi-cli defines the possible type tree of a valid OpenAPI definition and then traverses it. This approach is very similar to how compilers work and results in major performance benefits over other approaches. Extend functionality by following the [visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern).  Both the rules and the bundler features are following the visitor pattern to implement functionality on top of the parsed object.

## Installation

Run the `@redocly/openapi-cli` either with `npx` or after installing it locally.

If using `npx`, enter the following:

`npx @redocly/openapi-cli <command> [options]`

Otherwise, install the `@redocly/openapi-cli` with: 

```npm install -g @redocly/openapi-cli```

or:

```yarn global add @redocly/openapi-cli```

Run `openapi -h` to confirm the installation was successful (you'll see the usage information).

## Usage

Currently, `@redocly/openapi-cli` provides two commands `validate` and `bundle`.

### Bundling

You can bundle your OpenAPI 3 definition into a single file (this may be important for certain tools that lack multifile support). To bundle your OpenAPI 3 definition run following command:

```
openapi bundle --output <outputName> <startingPoint>
```

`<startingPoint>` is the name of your root document and `<outputName>` is desired output filename.

Supported extensions for `outputName` are `.json`, `.yml` and `.yaml`.

Beware, if the file specified as the bundler's output already exists, it will be overwritten.

### Validation

```openapi validate [options] <filePath>```

 Given this command, it will load the given ruleset and traverse the definition via the `filePath` parameter.

Also, it accepts `[options]` which can be:
- `--short` Reduce output to minimum.
- `--no-frame` Print no codeframes with errors.
- `--config <path>`  Specify custom yaml or json config.

In the section below, you can learn how to provide settings for the `@redocly/openapi-cli`.

## Configuration

All of the following rules are configurable in terms of disabling or changing their severity. To update a given rule, you should modify (or create) the `.openapi-cli.yml` file in the directory from which you are going to run the validator.

Also, you can provide the path to the configuration file name other than `.openapi-cli.yml` by using `--config` option when running the @redocly/openapi-cli.

If you are creating it from scratch, you might also want to enable/disable codeframes for the full output.

Below is the config, which is used by default:

```yaml
codeframes: on
rules:
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
codeframes: on
rules:
  no-extra-fields: off
  external-docs:
    url: off
  license-required:
    level: warning
  unique-parameter-names: off
  no-unused-schemas:
    level: warning
    excludePaths:
      - 'openapi.yaml#/components/schemas/Unused'
```

Check all the built-in rules [here](RULES.md).

## Credits

Thanks to [graphql-js](https://github.com/graphql/graphql-js) and [eslint](https://github.com/eslint/eslint) for inspiration of the definition traversal approach and to Swagger, Spectral, and Speccy for inspiring the ruleset.
