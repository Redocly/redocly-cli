# OpenAPI 3 CLI toolset

OpenAPI 3 CLI toolbox with rich validation and bundling features.

![Travis (.org)](https://img.shields.io/travis/Redocly/openapi-cli/master)
![npm (scoped)](https://img.shields.io/npm/v/@redocly/openapi-cli)
![NPM](https://img.shields.io/npm/l/@redocly/openapi-cli)

![OpenAPI 3 CLI toolset](./media/openapi-cli.gif)

## Features

Currently, @redocly/openapi-cli supports these features:

- [x] Multifile validation. No need to bundle your file before validation.
- [x] Configurable message levels for each rule. You can tailor your experience with @redocly/openapi-cli as you wish.
- [x] Lightning-fast validation. Check 1 Mb file in less than one second.
- [x] Human-readable error messages. Now with stacktrace and codeframes.
- [x] Intuitive suggestions for misspelled types or references.
- [x] Easy to implement custom rules. Need something? Ask us or do it yourself.
- [x] Bundle a multifile definition into a single file.
- [x] Preview reference docs for local development.

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

```openapi validate [options] <fileGlob>...```

 Given this command, it will load the given ruleset and traverse the definition via the `fileGlob` parameter. Check multiple APIs at once by adding each OpenAPI document to the CLI or by using globs: ```openapi validate "**/openapi.*" ```

Also, it accepts `[options]` which can be:
- `--short` Reduce output to minimum.
- `--no-frame` Print no codeframes with errors.
- `--config <path>`  Specify custom yaml or json config.

In the section below, you can learn how to provide settings for the `@redocly/openapi-cli`.

### Preview Docs

```openapi preview-docs [options] [entryPoint]```

Given this command, it will start a local development server and display the address to access the preview of the reference docs.  This works with both community-edition Redoc and the premium Redocly API Reference (with a valid license key).

## Configuration

### Configuration file

You may supply a configuration file, in YAML format, to control various options.

You can modify (or create) the `.redocly.yaml` file in the directory from which you are going to run the validator. Also, you can provide the path to the configuration file name other than `.redocly.yaml` by using `--config` option when running the @redocly/openapi-cli.

From a high-level, there are two configurable features: codeframes and rules.
```yaml
lint:
  codeframes: on
  rules:
  ...
```

### Codeframes

Codeframes are enabled by default.  You may disable them by setting the value to `off`.

```yaml
lint:
  codeframes: off
  rules:
  ...
```

### Rules

Rules control validations used on the API definition.  You may customize them (and even extend them), or you may utilize the default configuration.

Below is the default config:

```yaml
lint:
  codeframes: on
  rules:
    oas3-schema: on
    path-param-exists: on
    operation-2xx-response: on
    unique-parameter-names: on
    no-unused-schemas: on
    operation-operationId-unique: on
    path-declarations-must-exist: on

    camel-case-names: off
    api-servers: off
    license-url: off
    no-extra-fields: off
    operation-description: off
    operation-operationId: off
    operation-tags: off
    provide-contact: off
    servers-no-trailing-slash: off

    bundler: off
    debug-info: off
```

All of the rules are configurable in terms of disabling or changing their severity, or even defining pinpoint exclusions.

Here is an example of a modified use `.redocly.yaml` file:

```yaml
lint:
  codeframes: on
  rules:
    no-extra-fields: off
    external-docs:
      url: off
    license-required: warning
    unique-parameter-names: off
    no-unused-schemas:
      level: warning
      excludedPaths:
        - 'openapi.yaml#/components/schemas/Unused'
```

Each rule can be turned `on` or `off`.  In addition, you can control the log-level severity, between `info`, `warning`, and `error`.  You may also define specific exclusions to the rule, and you can do that by combination of file and bath to the object to be excluded.

Enabling a rule:
```yaml
lint:
  rules:
    <rule-name>: on
```

Disabling a rule:
```yaml
lint:
  rules:
    <rule-name>: off
```

#### Rules Severity Levels

Changing the severity of a rule:

```yaml
lint:
  rules:
    <rule-name>:
      level: warning
```

or

```yaml
lint:
  rules:
    <rule-name>: <value>
```

Possible values are:

* info
* warning
* error

#### Rules Path Exclusions

Excluding a specific path:

```yaml
lint:
  rules:
    <rule-name>:
      excludedPaths:
        - '<path to file>#</path/to/object>'
```

The `excludedPaths` key can accept an array of exclusions.  The format includes the path to the file, a `#` mark, and the path to the object within the file.  For example:

```yaml
lint:
  rules:
    <rule-name>:
      excludedPaths:
        - 'openapi.yaml#/components/schemas/Pet'
```

Some rules may have sub-rules.  The same configurations still apply:

```yaml
lint:
  rules:
    <rule-name>:
      <sub-rule-name>:
        level: info
        excludedPaths:
          - 'openapi.yaml#/components/schemas/Pet'
```

#### Built-in Rules

[Read the docs](RULES.md) for the built-in rules. You also can [create](RULES.md/#string-matcher) your own regular expressions' based rules for `openapi-cli`.

### Advanced

[Custom visitors](docs/CUSTOM_VISITORS.md)

[Transformers](docs/TRANSFORMERS.md)

## Credits

Thanks to [graphql-js](https://github.com/graphql/graphql-js) and [eslint](https://github.com/eslint/eslint) for inspiration of the definition traversal approach and to [Swagger](https://github.com/swagger-api/swagger-editor), [Spectral](https://github.com/stoplightio/spectral), and [Speccy](https://github.com/wework/speccy) for inspiring the ruleset.
