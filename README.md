# @redocly/openapi-cli. Open API 3 cli toolset

## Approach
Unlike other OpenAPI validators @redocly/openapi-cli defines the possible type tree of a valid OpenAPI definition and then traverses it. This approach is very similar to how compilers work and gives major performance benefits over other approaches. Also, it allows to easily add custom or quite complex visitors. For now, they include validation rules and a bundler.

## Features

![@redocly/openapi-cli output screenshot](/media/screenshot-output.png)

As for now, @redocly/openapi-cli supports such features:

- [x] Multifile validation. No need to bundle your file before using validator.
- [x] Configurable message levels for each rule. You can tailor your experience with @redocly/openapi-cli as you wish.
- [x] Lightning fast validation. Check 1 Mb file less than in one second.
- [x] Human readable error messages. Now with stacktrace and codeframes.
- [x] Intuitive suggestions for misspelled type names or references.
- [x] Easy to implement custom rules. Need something? Ask us or do it yourself.

## Usage

You can run the `@redocly/openapi-cli` either with `npx` or after installing it locally.

If using `npx`, you can just enter the following:

`npx @redocly/openapi-cli <command> [options]`.

Otherwise, you can install the `@redocly/openapi-cli` with `npm i -g @redocly/openapi-cli` or `yarn global add @redocly/openapi-cli`. After that, try to run `openapi -h` and if installation was successful, you'll see the usage information.

Currently, `@redocly/openapi-cli` supports only one command: `validate [options] <filePath>`. Given this command, it will load the given ruleset and traverse the definition via the `filePath` parameter.

Also, it accepts `[options]` which can be:
- `-s, --short` Reduce output to required minimun
- `-f, --no-frame` Print no codeframes with errors.
- `--config <path>`  Specify custom yaml or json config

In the section below, you can check about how one can provide settings for the `@redocly/openapi-cli`.
## Configuration

All of the following rules are configurable in terms of disabling or changing their severity. In order to update given rule, you should modify (or create) the `.openapi.yml` file in the directory from which you are going to run the validator.

Also, you can provide path to configuration file name other than `.openapi.yml` by using `--config` option when running the @redocly/openapi-cli.

If you are creating it from scratch, you might also want to enable/disable codeframe for the full output.

Below is the config, which is used by default:

```yaml
enableCodeframe: true
enbaleCustomRuleset: true
rules:
  bundler: off
  debug-info: off

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

Here is an example of a modified use `.openapi.yml` file:

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

## Ruleset overview

Below you can find a list of the all currently supported rules. To change your settings for given rule, just add or modify corresponding item in the `rules` section of the `.openapi.yml` in your working directory.

### api-servers
OpenAPI servers must be present and be a non-empty array.

### path-param-exists
Each path parameter in the `parameters` section must be present in the path string.

### license-url
License, if provided within `info` section must provide `url` field.

### no-unused-schemas
It might be a bad sign if some of the schemas from the `components` section are not used anywhere. This checks for such scenarios.

### operation-2xx-response
When designing an API it's usually expected to do something succesfully, although it might fail. So, this rule validates, that there is at least one response in the operation with a 2xx status code.

### operation-description
This rule enforces to provide `description` field in `operation`s as within large definition it becomes really easy to lose track of things.

### operation-operationId
Enforce presence of the `operationId` field in each `operation`.

### operation-operationId-unique
`operationId`s are expected to be unique to really identify operations. This rule checks this principle.

### operation-tags
The `tags` field must be present and be a non-empty array in each `operation`.

### path-declarations-must-exist
Within the `operation` path definition you can define path parametrs. If you do so, each declaration of the parameter name within path must be a non-null string. For example, `/api/user/{userId}/profie` is a valid definition with `userId` parameter, but `/api/user/{}/profile` is not.

### path-keys-no-trailing-slash
Generally, it is considered less confusing if you do not have trailing slashes in your paths.  Also, it depends on tooling are `example.com/api/users` and `example.com/api/users/` are treated in the same way, so we suggest you to be consistent on this page.

### provide-contact
Info object must contain `contact` field.

Most of the APIs are not perfect, so there is something useful for your users to know, who can help in case of problems.

### servers-no-trailing-slash
Server URL must not have a trailing slash.

It depends on tooling are `example.com` and `example.com/` are treated in the same way. In the worst case, the latter option when conjuncted with operations paths migth result into `example.com//api/users`.

### unique-parameter-names
Parameters in `operation` objects must be `unique` definition wide.

### oas3-schema
This rule enforces the structural validation of the OpenAPI definitions according to the OpenAPI Specification 3.0.2. It can be fine-tuned to disable or change message level for each specific type of the OpenAPI Objects. For example, if you have custom structure of the `servers` object, what you can do to prevent error messages regarding it is to update your `.redocly.yml` to the following pattern:

```yaml
... your configuration
rules: 
  ...other rules,
  oas3-schema: 
    servers:
      level: warning    
```
or even totally disable:
```yaml
... your configuration
rules: 
  ...other rules,
  oas3-schema: 
    servers: off
```

Below, you can find the table of available sub-rules you can update:

| Sub-rule name | OpenAPI Object it corresponds to|
|---|---|
| root | [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oasObject) |
| info | [Open API Info Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#infoObject) |
| contact | [Open API Contact Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#contactObject) |
| discriminator | [Open API Discriminator Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#discriminatorObject) |
| encoding | [Open API Encoding Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#encodingObject) |
| example | [OpenAPI Example Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject) |
| external-docs | [OpenAPI External Documentation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject) |
| header | [OpenAPI Header Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#headerObject) |
| license | [OpenAPI License Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#licenseObject) |
| link | [OpenAPI Link Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#linkObject) |
| media-object | [OpenAPI Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#mediaTypeObject) | 
| operation | [OpenAPI Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject) |
| parameter | [OpenAPI Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject) |
| path | [OpenAPI Path Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject) |
| request-body | [OpenAPI Request Body Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#requestBodyObject) |
| response | [OpenAPI Response Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject) |
| schema | [OpenAPI Schema Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject) |
| secuirty-schema | [OpenAPI Security Scheme Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securitySchemeObject)|
| auth-code-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| client-creds-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| implicit-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| password-flow | [Open API Flow Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject)|
| server | [OpenAPI Server Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverObject) |
| server-variable | [OpenAPI Server Variable Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverVariableObject) |
| tag | [OpenAPI Tag Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#tagObject) |
| xml | [OpenAPI XML Obejct](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#xmlObject) |

#### no-extra-fields
By default, custom fields, not defined within OpenAPI specification can be included only using `x-` prefix. This rule enforces such policy.


## Linting rules
### suggest-possible-refs
It is not totally uncommon to have a bad `$ref` in your definition. For example, instead of `#components/schemas/User` one might type `#components/schemas/Use`.

With this rule enabled, @redocly/openapi-cli will try to find the closest possible valid `$ref` address in the definition.

## Bundling

Also, you can enable bundling feature, which will bundle your Open API 3 definition into a single file. To do so, modify you config file so that `bundler` object in `rules` would look like following:

```yaml
rules:
  bundler:
    output: your-desired-filename.yml
```

Supported extensions for bundle files are `.json`, `.yml` and `.yaml`.

If the file specified as the bundlers output already exists, it will be overwritten.

## License

Copyright 2019 Redoc.ly LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.