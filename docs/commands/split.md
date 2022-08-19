# `split`

## Introduction

The `split` command takes an API definition file and creates a [multi-file structure](../../resources/multi-file-definitions.md) out of it by extracting referenced parts into standalone, separate files. Essentially, the `split` command does the opposite of the `bundle` command.

:::warning
The `split` command doesn't support OpenAPI 2.0 definitions.
:::

## Usage

```bash
redocly split <api> --outDir=<path>
redocly split [--help] [--version]
redocly split --version
```

## Options

Option | Type | Description
-- | -- | --
api | string | **REQUIRED.** Path to the API definition file that you want to split into a multi-file structure.
--outDir | string | **REQUIRED.** Path to the directory where you want to save split files. If the specified directory doesn't exist, it will be created automatically.
--help | boolean | Show help.
--separator | string | File path separator used while splitting. The default value is `_`. This controls the file names generated in the `paths` folder (e.g. `/users/create` path becomes `user_create.yaml`).
--version | boolean | Show version number.

## Example

```bash Command
redocly split pet.yaml --outDir=openapi
```

```bash Output
Document: pet.yaml is successfully split
 and all related files are saved to the directory: openapi

pet.yaml: split processed in 33ms
```

In the `openapi` directory, the `split` command "unbundles" the specified API definition. Code samples, components, and paths are split from the root definition into separate files and folders. The structure of the unbundled directory corresponds to the structure created by our [openapi-starter](https://github.com/Redocly/openapi-starter) tool.
