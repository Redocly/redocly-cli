---
tocMaxDepth: 2
---

# OpenAPI CLI changelog

## 1.0.0-beta-93 (2022-04-05)

### Fixes

- Resolved an issue with the `push` command skipping dependencies.

---

## 1.0.0-beta-92 (2022-04-04)

### Features

- Introduced [assertions](./resources/rules/assertions.md) - a new, powerful lint feature, which helps you enforce API design standards without coding custom rules.
- The `push` command supports a new `--skip-decorator` option.

### Fixes

- Resolved an issue with `openapi preview-docs` failing during authorization.

---

## 1.0.0-beta-91 (2022-03-29)

### Features

- Added the `--separator` option to the `split` command. Use it to change the separator character that's used instead of whitespace in file names. The default is `_ `, which means that after splitting, path file names look like this: "user_login.yaml", "user_logout", etc.

### Fixes

- Resolved an issue with the `bundle` command when handling files with multiple dots in the file name.

---

## 1.0.0-beta.90 (2022-03-24)

### Fixes

- Updated types to support validation of the Redocly configuration file according to the new file structure.

----

## 1.0.0-beta.89 (2022-03-21)

### Features

- Internal changes of `redocly.yaml` config structure - add new mock server options to `redocly.yaml` schema.

### Fixes

- Fixed crash when there's an empty `redocly.yaml` file.

----

## 1.0.0-beta.88 (2022-03-16)

### Features

- Internal changes of `redocly.yaml` config structure.

### Fixes

- Fixed an issue with the `lint` command highlighting the entire file when `servers` are missing in OAS3. Now it highlights only the `openapi` field, indicating an incorrect OpenAPI definition.
- Fixed an issue with the `lint` command highlighting all parent values when one of the child fields has an empty value instead of highlighting the field itself.

----

## 1.0.0-beta.87 (2022-03-10)

### Fixes

- Fixed an issue with `process.env` assignment that caused crashes in client-side builds.
- Fixed an issue with `no-path-parameter` rule reporting false-positives.

----

## 1.0.0-beta.86 (2022-03-09)

### Features

- Allowed to name the config file either `.redocly.yaml` or `redocly.yaml`.

### Fixes

- The `spec` rule triggers an error when a parameter is missing `schema` or `content` fields.

----

## 1.0.0-beta.85 (2022-03-02)

- Internal improvements

----

## 1.0.0-beta.84 (2022-02-23)

### Fixes

- Fixed an issue with the `lint` command crashing when the `servers.url` field is empty in the OpenAPI definition.
- Fixed an issue with the `lint` command crashing when an `enum` value is invalid.

----

## 1.0.0-beta.83 (2022-02-22)

### Features

- Added the `webhooks` and [x-webhooks](https://redocly.com/docs/api-reference-docs/specification-extensions/x-webhooks/#x-webhooks) support to the `split` command.

----

## 1.0.0-beta.82 (2022-02-15)

### Fixes

- Removed support for using OpenAPI CLI behind a proxy server.

----

## 1.0.0-beta.81 (2022-02-10)

### Features

- Added support for using OpenAPI CLI behind a proxy server.

### Fixes

- Fixed an issue with the `lint` command not reporting errors when `securityDefinitions.basic` contains the unsupported `additionalProperty` in OAS2.
- Fixed an issue with the `no-invalid-media-type-examples` built-in rule that didn't work on examples containing a `$ref`.
- Fixed an issue with the `lint` command incorrectly reporting boolean schemas for array items as invalid.
- Fixed an issue with `isPathParameter` failing because of an incorrect brace.

----

## 1.0.0-beta.80 (2022-01-24)

### Fixes

- Fixed an issue with date-time conversion in YAML files.
- Fixed an issue with the `oauth2-redirect.html` file being absent when served by `preview-docs` command.

----

## 1.0.0-beta.79 (2022-01-10)

### Fixes

- Fixed the `remove-x-internal` decorator to remove references to removed `x-internal` components.
- Fixed the `remove-unused-components` decorator that strips remotely referenced components.

----

## 1.0.0-beta.78 (2022-01-06)

### Features

- Added the `remove-x-internal` built-in decorator.
- Added the `--remove-unused-components` option to the `bundle` command.

----

## 1.0.0-beta.77 (2022-01-06)

### Fixes

- Fixed an issue with backslashes in `$refs` to paths with the `split` command in a Windows environment.

----

## 1.0.0-beta.76 (2021-12-28)

### Features

- Exported `mapTypeToComponent` function.

----

## 1.0.0-beta.75 (2021-12-24)

### Features

- Added the `--host` option to the `preview-docs` CLI command.

### Fixes

- Fixed an issue with continuous deployment to Docker Hub.

----

## 1.0.0-beta.74 (2021-12-22)

### Fixes

- Fixed an issue with `const` not handled correctly by the `lint` command.

----

## 1.0.0-beta.73 (2021-12-16)

### Fixes

- Resolved another backward compatibility issue with older versions of portal.

----

## 1.0.0-beta.72 (2021-12-16)

### Fixes

- Fixed another backward compatibility issue with regions: save old config key to support old portal versions.

----

## 1.0.0-beta.71 (2021-12-16)

### Fixes

- Fixed a backward compatibility issue with `REDOCLY_DOMAIN` in the EU region introduced in the previous release.

----

## 1.0.0-beta.70 (2021-12-14)

### Features

- Added support for the [region](./configuration/configuration-file.mdx#region) option with the `login`, `push`, and other commands.
- Added two new built-in rules:
  - [no-invalid-schema-examples](./resources/built-in-rules.md#no-invalid-schema-examples)
  - [no-invalid-parameter-examples](./resources/built-in-rules.md#no-invalid-parameter-examples)

### Fixes

- Fixed an issue with the built-in `paths-kebab-case` rule that disallowed paths with trailing slashes.
- Fixed a validation issue with the `example` property when the schema is an array.

----

## 1.0.0-beta.69 (2021-11-16)

### Features

- Implemented new `--extends` and `--metafile` options for the [bundle](./commands/bundle.md#options) command.

----

## 1.0.0-beta.68 (2021-11-15)

### Fixes

- Fixed an issue with hot reloading when running a preview of reference docs with `openapi preview-docs`.
- Fixed an issue with page refresh when pagination is set to `item` or `section`.
- Fixed an issue with inlining external schema when components' names match.
- Fixed an issue with fetching hosted schema on Windows when bundling OAS definitions.
- Fixed an issue for `no-server-trailing-slash` when server url is a root.

----

## 1.0.0-beta.67 (2021-11-02)

### Features

- Added a new built-in rule: [operation-4xx-response](./resources/built-in-rules.md#operation-4xx-response).

----

## 1.0.0-beta.66 (2021-11-01)

### Features

- Added five new built-in rules:
  - [path-excludes-patterns](./resources/built-in-rules.md#path-segment-plural)
  - [no-http-verbs-in-paths](./resources/built-in-rules.md#no-http-verbs-in-paths)
  - [path-excludes-patterns](./resources/built-in-rules.md#path-excludes-patterns)
  - [request-mime-type](./resources/built-in-rules.md#request-mime-type)
  - [response-mime-type](./resources/built-in-rules.md#response-mime-type)

### Fixes

- Fixed an issue with OAS 3.1 meta keywords reported as not expected.
- Fixed an issue with incorrect codeframe for `info-license-url` rule.
- Fixed an issue with discriminator mapping not supported in `no-invalid-media-type-examples`.
- Fixed an issue with ignore file generated in windows not working on other systems, and in Redocly Workflows.

----

## 1.0.0-beta.65 (2021-10-27)

### Features

- Added three built-in decorators - `info-description-override`, `tag-description-override`, `operation-description-override` - that let you modify your API definitions during the bundling process. Use these decorators in the `lint` section of your `.redocly.yaml` file to point OpenAPI CLI to Markdown files with custom content. That custom content will replace any existing content in the `info.description` field, and in `tags.description` and `operation.description` fields for specified tag names and operation IDs.

The following examples show how to add the decorators to the `.redocly.yaml` file:


```yaml info-description-override
lint:
  decorators:
    info-description-override:
      filePath: ./my-custom-description.md
```

```yaml tag-description-override
lint:
  decorators:
    tag-description-override:
      tagNames:
        pet: ./my-custom-description.md
```

```yaml operation-description-override
lint:
  decorators:
    operation-description-override:
      operationIds:
        updatePet: ./my-custom-description.md
```

- Improved documentation for [the lint command](./commands/lint.md).

### Fixes

- Fixed the the `bundle` command to return a non-zero code when it detects an error when used with the `--lint` option.

----

## 1.0.0-beta.64 (2021-10-20)

### Fixes

- Fixed an issue with the `--format` option not working with the `bundle` command.

- Fixed a validation issue with the non-string `openapi` value in API definitions. The `lint` command now warns if the value is not string instead of crashing.

----

## 1.0.0-beta.63 (2021-10-12)

### Features

- Upgraded the `js-yaml` package from v.3 to v.4 with YAML 1.2 support. This resolves issues with parsing timestamps and example strings with leading zeros in YAML.

----

## 1.0.0-beta.62 (2021-09-30)

### Fixes

- Resolved an issue with the `--max-problems` option that was not working with the `bundle` command.

----

## 1.0.0-beta.61 (2021-09-21)

### Features

- Improved validation of values for the following fields in the Schema Object: `multipleOf, maxLength, minLength, maxItems, minItems, maxProperties, minProperties`.

----

## 1.0.0-beta.60 (2021-09-20)

### Fixes

- Fixed an issue with the `join` command crashing when trying to resolve $ref.


----

## 1.0.0-beta.59 (2021-09-15)

### Fixes

- Resolved an issue with the `preview-docs` command not working when running `openapi-cli` in a Docker container.

- Improved the security of local documentation previews by removing query parameters from the request URL.


----

## 1.0.0-beta.58 (2021-09-02)

### Fixes

- Internal improvements to configuration types.


----

## 1.0.0-beta.57 (2021-09-01)

### Fixes

- Simplified the login check query to improve performance.


----

## 1.0.0-beta.56 (2021-09-01)

### Features

- Added a function for linting the `.redocly.yaml` configuration file.

- Published [the OpenAPI CLI quickstart guide](quickstart.md) as part of our Google Season of Docs 2021 project.


----

## 1.0.0-beta.55 (2021-08-20)

### Features

- Updated and improved the [introductory content](index.md) and [installation instructions](installation.md) for OpenAPI CLI as part of our Google Season of Docs 2021 project.

- Implemented improvements to the internal CD process.


----

## 1.0.0-beta.54 (2021-07-19)

- Internal changes.


----

## 1.0.0-beta.53 (2021-07-02)

### Fixes

- Resolved an issue with transitive $ref resolution in the JSON schema validator.

- If the JSON schema validator crashes, OpenAPI CLI will now report the problem in the output instead of crashing itself.


----

## 1.0.0-beta.52 (2021-07-01)

### Fixes

- The `operation-operationId` rule no longer triggers a warning when one or more operations in the `callbacks` object don't have `operationId` defined.


----

## 1.0.0-beta.51 (2021-06-30)

### Features

- Our [official OpenAPI CLI documentation](https://redocly.com/docs/cli/) is now open-source! 🥳 You can find the source of all pages published on our website in the `docs` folder of the [openapi-cli repository](https://github.com/Redocly/openapi-cli/tree/master/docs). We invite you to help us improve the documentation and make it more usable for everyone. Please make sure to always follow our [Code of conduct](https://redocly.com/code-of-conduct/) in all your contributions.

- Implemented support for OpenAPI 3.1 in `typeExtension` plugins.

### Fixes

- Resolved a crash caused when processing properties with the `null` value.

- Resolved a "Maximum call stack size exceeded" issue in the JSON schema validator caused by recursive `oneOf`.


----

## 1.0.0-beta.50 (2021-06-08)

### Fixes

- Implemented improvements to the `openapi-cli` package to reduce the size of the browser bundle.


----

## 1.0.0-beta.49 (2021-06-01)

### Fixes

- Removed unused keywords in OpenAPI 3.1.

- Resolved an issue with the `openapi bundle` command failing because of the missing `js-yaml` dependency.


----

## 1.0.0-beta.48 (2021-05-25)

### Fixes

- Resolved an issue with the plugin ID being prefixed to all rules, preprocessors and decorators multiple times (for example, when using the `preview-docs` command and changing configuration files).


----

## 1.0.0-beta.47 (2021-05-21)

### Features

- The `bundle` command now supports an optional `--lint` parameter.

### Fixes

- Improved the error messages for `kebab-case` and implemented detection of `snake_case` usage in paths.

- The `join` command will no longer overwrite an existing `x-displayName` of a tag with the tag's `name` property.


----

## 1.0.0-beta.46 (2021-05-17)

### Features

- Implemented support for [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/releases/tag/3.1.0). You can now lint, validate, and bundle your OAS 3.1 definitions with OpenAPI CLI.


----

## 1.0.0-beta.45 (2021-05-09)

### Fixes

- Resolved a validation issue for `enum` items with the nullable property. Validation errors are no longer reported when `nullable: true` for `enum` items that contain a `null` value.


----

## 1.0.0-beta.44 (2021-04-12)

### Fixes

- The `browser` field in `package.json` is now set to simplify using `openapi-core` in browser-based builds.


----

## 1.0.0-beta.43 (2021-04-09)

### Fixes

- The root API definition document is now parsed in all cases, even if it doesn't report the correct MIME type or doesn't use any of the supported file extensions.


----

## 1.0.0-beta.42 (2021-04-06)

### Fixes

- Improved `openapi-core` so that it can be used within our other projects including Redoc, Reference docs, and Developer portal.


----

## 1.0.0-beta.41 (2021-04-02)

### Fixes

- Resolved an issue with the `--dereferenced` CLI option not functioning properly.


----

## 1.0.0-beta.40 (2021-03-31)

### Fixes

- Resolved an issue where transitive $refs that span multiple files would crash the validation in some cases.


----

## 1.0.0-beta.39 (2021-03-26)

### Fixes

- Resolved a hot-reloading issue with the `preview-docs` command. It will now automatically reload the docs in the browser when you make live changes to an OpenAPI definition.


----

## 1.0.0-beta.38 (2021-03-20)

### Fixes

- Exported a helper function from `openapi-core` and implemented defaults for some functions to improve integration with the Developer portal.


----

## 1.0.0-beta.37 (2021-03-16)

### Fixes

- Implemented error handling for failed file uploads when using the `push` command. The command now displays success/failure messages in the output.


----

## 1.0.0-beta.36 (2021-03-15)

### Features

- Source type was changed from `FILE` to `CICD` to support integration with the new CI/CD source in Workflows.


----

## 1.0.0-beta.35 (2021-03-12)

### Features

- OpenAPI CLI now has tab completion for global installations. Run `openapi completion` for instructions to set it up in your environment.


----

## 1.0.0-beta.34 (2021-03-10)

### Features

- OpenAPI CLI now has an official Docker image! You can get it from [Docker Hub](https://hub.docker.com/repository/docker/redocly/openapi-cli).


----

## 1.0.0-beta.33 (2021-03-10)

### Features

- You can now use the `--verbose` parameter with the `login` command to show a detailed error trace (if any). Detailed error output will no longer be displayed by default for this command.


----

## 1.0.0-beta.32 (2021-02-25)

### Features

- The "access token" has been renamed to "API key" in the output of relevant OpenAPI CLI commands (`login`, `push`) to make it clearer what information the users must provide.

- For improved security, the API key is now hidden (masked) when the user provides it in the terminal, and it's not logged in the user's history.


----


## 1.0.0-beta.31 (2021-01-25)

### Features

- The `bundle` method is now able to accept `Document` directly in openapi-core.


----


## 1.0.0-beta.30 (2021-01-25)

### Features

- OpenAPI CLI now automatically resolves all $refs by default, even in places where they are not allowed by the specification ("incorrect $refs"). This functionality can be disabled for examples by setting `doNotResolveExamples` to `true` in `redocly.yaml`.


----


## 1.0.0-beta.29 (2021-01-13)

### Fixes

- Fixed an issue with incorrect base directory when resolving transitive `$refs`.


----


## 1.0.0-beta.28 (2021-01-09)

### Fixes

- Resolved an issue with nested filepaths that caused the `push` command to upload files to the wrong path when used on Windows systems.


----


## 1.0.0-beta.27 (2021-01-06)

### Features

- A new command called `push` is now supported by OpenAPI CLI. With this command, you can upload your API definitions and associated files, and set up your own CI pipeline for updating API definitions without granting Redocly Workflows access to your repositories.


### Fixes

- Resolved an issue that prevented using the `.` (dot) symbol in version names with the `push` command.


----


## 1.0.0-beta.25 (2020-11-27)

### Fixes

- Resolved an issue with `assert-node-version` using the wrong path.

- OpenAPI CLI will now bundle the API definition before gathering stats.


----


## 1.0.0-beta.23 (2020-11-24)

### Fixes

- Resolved issues with tag logic and tag display names for the `join` command.

- Refactored CLI command handlers.


----


## 1.0.0-beta.22 (2020-11-16)

### Features

- A new command called `join` is now available in OpenAPI CLI. Use it to combine two or more API definition files into one. The resulting file optionally helps distinguish the origin of OpenAPI objects and properties by appending custom prefixes to them. Note that this command is considered experimental; meaning, it's still a work in progress.


----


## 1.0.0-beta.19 (2020-11-13)

### Features

- The previously single OpenAPI CLI package has been split into two: `openapi-cli` and `openapi-core`.


----


## 1.0.0-beta.18 (2020-10-19)

### Features

- OpenAPI CLI now supports the `split` command, which you can use to create a multi-file structure out of an API definition file by extracting referenced parts into standalone, separate files. The command doesn't support OAS 2.


### Fixes

- Resolved an issue with counting operation tags in the `stats` command.


----


## 1.0.0-beta-16 (2020-09-28)

### Features

- A new command called `stats` has been implemented. It provides statistics about the structure of one or more API definition files, and lets you choose the format in which the statistics will be presented.


### Fixes

- Resolved an issue with the `glob` library by installing the missing package.


----


## 1.0.0-beta-15 (2020-09-25)

### Fixes

- Resolved an issue with the extended regex path which was missing the dot symbol.

- Added support for non-compatible globbing shells.


----


## 1.0.0-beta-14 (2020-09-14)

### Fixes

- Added the missing label definition for `x-codeSamples` and enabled `x-codeSamples` for OAS 2.


----


## 1.0.0-beta-13 (2020-09-13)

### Fixes

- Fixed the required field name for `openIdConnectUrl`.

- Resolved an issue with detecting duplicated plugin IDs, and added a warning that plugin IDs must be unique.

- Adedd `engines` and `engineStrict` to `package.json`.

- Implemented better handling and error messages for invalid severity values.


----


## 1.0.0-beta-12 (2020-09-08)

### Fixes

- Previously, OpenAPI CLI tried to use `/` instead of `\` for file path splitting on Windows machines. The issue has been resolved by implementing platform-specific separator usage.


----


## 1.0.0-beta-11 (2020-09-03)

### Fixes

- Resolved an issue with missing support for external plugins in the bundled version.


----


## 1.0.0-beta.10 (2020-08-31)

### Fixes

- Fixed a crash that happened when attempting to resolve back-references.

- The version number of OpenAPI CLI is now printed in the JSON output.


----


## 1.0.0-beta.9 (2020-08-20)

### Features

- The `--format` option now supports JSON as one of the output formats you can choose when using OpenAPI CLI commands.

- Bundling and uploading are now part of the build process.

- Warnings and errors are now displayed as separate counts in JSON output.

- All parts of a pointer are now used to generate unique component names when needed.

- Added support for linting `x-webhooks`, which is a forward-compatibility vendor extension for `webhooks` from OpenAPI 3.1.


### Fixes

- Removed an extra blank line that was printed when no rules were ignored.

- Resolved an issue with missing types for `OasDecorator` and `Oas3Decorator`.

- Resolved a tag syntax error when deploying to Workflows.

- Relative paths are now used for JSON output.


----


## 1.0.0-beta.8 (2020-07-30)

### Fixes

- Added mime-type handling for remote docs.


----


## 1.0.0-beta-7 (2020-07-26)

### Fixes

- Fixed the callbacks type definition.

- Fixed invalid component names for some components.

- Resolved an issue with bundling local references.

- Resolved a minor issue where the help message displayed references to the `registry:login` command instead of the `login` command.


----


## 1.0.0-beta.5 (2020-07-21)

### Fixes

- Fixed invalid unescape and `decodeURIComponent`.

- Updated the `extends` parameter logic to allow configuration overrides.

- Improved handling logic and error message when the input file is not an OpenAPI document.


----


## 1.0.0-beta.4 (2020-07-14)

### Fixes

- Resolved an issue with detecting output file extension without an entrypoint.

- Resolved an issue with the `preview-docs` command failing to automatically select the first definition from the `apiDefinitions` section of the configuration file when used without arguments.

- Fixed an issue with relative paths for entrypoints from external configuration files.


----


## 1.0.0-beta.3 (2020-07-10)

### Fixes

- The `default.hbs` file is now copied to the build directory.

- Resolved an issue with the preview functionality failing to access `watcher`.


----


## 1.0.0-beta.2 (2020-07-09)

### Fixes

- Resolved an issue with the `no-path-trailing-slash` rule showing errors for the wrong location and path.

- Fixed a transitive resolve issue.


----


## 1.0.0-beta.1 (2020-07-09)

First beta release!
