# `split`

## Introduction

The `split` command takes an API description file and creates a [multi-file structure](../../resources/multi-file-definitions.md) out of it by extracting referenced parts into standalone, separate files. The advantage of this approach is making smaller files that are easier to manage and a structure that makes reviewing simpler.

Use `bundle` and supply the main file as the entrypoint to get your OpenAPI description in one file. Many OpenAPI tools prefer a single file, but `split` and `bundle` allow you to manage your files easily for development, and then prepare a single file for other tools to consume.

{% admonition type="warning" name="OpenAPI 3.x only" %}
The `split` command doesn't support OpenAPI 2.0 descriptions.
{% /admonition %}

## Usage

```bash
redocly split <api> --outDir=<path>
redocly split [--help] [--version]
redocly split --version
```

## Options

| Option        | Type    | Description                                                                                                                                                                              |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api           | string  | **REQUIRED.** Path to the API description file that you want to split into a multi-file structure.                                                                                       |
| --config      | string  | Specify path to the [config file](../configuration/index.md).                                                                                                                            |
| --help        | boolean | Show help.                                                                                                                                                                               |
| --lint-config | string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                       |
| --outDir      | string  | **REQUIRED.** Path to the directory where you want to save split files. If the specified directory doesn't exist, it is created automatically.                                           |
| --separator   | string  | File path separator used while splitting. The default value is `_`. This controls the file names generated in the `paths` folder (e.g. `/users/create` path becomes `user_create.yaml`). |
| --version     | boolean | Show version number.                                                                                                                                                                     |

## Example

{% tabs %}
{% tab label="Command" %}

```bash
redocly split pet.yaml --outDir=openapi
```

{% /tab  %}
{% tab label="Output" %}

```bash
Document: pet.yaml is successfully split
 and all related files are saved to the directory: openapi

pet.yaml: split processed in 33ms
```

{% /tab  %}
{% /tabs  %}

In the `openapi` directory, the `split` command "unbundles" the specified API description. Code samples, components, and paths are split from the root API description into separate files and folders. The structure of the unbundled directory corresponds to the structure created by our [openapi-starter](https://github.com/Redocly/openapi-starter) tool.
