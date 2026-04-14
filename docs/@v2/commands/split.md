# `split`

## Introduction

The `split` command takes an API description file and creates a [multi-file structure](https://redocly.com/docs/resources/multi-file-definitions/) out of it by extracting referenced parts into standalone, separate files.
The advantage of this approach is making smaller files that are easier to manage and a structure that makes reviewing simpler.

{% admonition type="warning" name="Supported specifications" %}
The `split` command supports OpenAPI 3.x, AsyncAPI 2.x, and AsyncAPI 3.x descriptions. OpenAPI 2.x (Swagger) is not supported.
{% /admonition %}

The parts that get split depend on the type of API description:

**OpenAPI 3.x**

Components, paths, and webhooks are split from the root API description into separate files and folders.
The structure of the unbundled directory corresponds to the structure created by the [openapi-starter](https://github.com/Redocly/openapi-starter) tool.

- `paths/` - each path item is written to a separate file
- `webhooks/` - each webhook is written to a separate file (OpenAPI 3.1+)
- `components/` - schemas, responses, parameters, examples, headers, requestBodies, links, callbacks, and securitySchemes are each split into subdirectories

**AsyncAPI 2.x**

Channels and components are split from the root API description into separate files and folders.

- `channels/` - each channel is written to a separate file
- `components/` - schemas, messages, securitySchemes, parameters, correlationIds, messageTraits, operationTraits, serverBindings, channelBindings, operationBindings, and messageBindings are each split into subdirectories

**AsyncAPI 3.x**

Channels, operations, and components are split from the root API description into separate files and folders.

- `channels/` - each channel is written to a separate file
- `operations/` - each operation is written to a separate file
- `components/` - schemas, messages, securitySchemes, servers, serverVariables, parameters, replies, replyAddresses, correlationIds, messageTraits, operationTraits, tags, externalDocs, serverBindings, channelBindings, operationBindings, and messageBindings are each split into subdirectories

Use the [`bundle`](./bundle.md) command and supply the main file as the entrypoint to get your API description back in one file.
Many API tools prefer a single file, but `split` and `bundle` allow you to manage your files easily for development, and then prepare a single file for other tools to consume.

## Usage

```bash
redocly split <api> --outDir=<path>
redocly split [--help] [--version]
redocly split --version
```

## Options

| Option        | Type    | Description                                                                                                                                                                                                                               |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api           | string  | **REQUIRED.** Path to the API description file that you want to split into a multi-file structure.                                                                                                                                        |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                                                      |
| --help        | boolean | Show help.                                                                                                                                                                                                                                |
| --lint-config | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                        |
| --outDir      | string  | **REQUIRED.** Path to the directory where you want to save the split files. If the specified directory doesn't exist, it is created automatically.                                                                                        |
| --separator   | string  | File path separator used while splitting. The default value is `_`. This controls the file names generated in the `paths` folder (e.g. `/users/create` path becomes `user_create.yaml`, root level path `/` becomes `_.yaml`, and so on). |
| --version     | boolean | Show version number.                                                                                                                                                                                                                      |

## Examples

### View successful split message

This `split` command "unbundles" the specified API description, as defined in `pet.yaml`, into the `openapi` output directory:

```bash
redocly split pet.yaml --outDir=openapi
```

A confirmation message is displayed with a successful split:

<pre>
Document: pet.yaml is successfully split
 and all related files are saved to the directory: openapi

pet.yaml: split processed in 33ms
</pre>
