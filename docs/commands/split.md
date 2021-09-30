# `split`

## Introduction

The `split` command takes an API definition file and creates a [multi-file structure](../index.md#multi-file-approach) out of it by extracting referenced parts into standalone, separate files. Essentially, the `split` command does the opposite of the `bundle` command.

:::warning
The `split` command doesn't support OpenAPI 2.0 definitions.
:::

## Usage

```bash
openapi split <entrypoint> --outDir=<path>
openapi split [--help] [--version]
openapi split --version
```

## Options

Option                    | Type      | Required     | Default     | Description
--------------------------|:---------:|:------------:|:-----------:|------------
`entrypoint`              | `string`  | yes          | -           | Path to the API definition file that you want to split into a multi-file structure
`--outDir`                | `string`  | yes          | -           | Path to the directory where you want to save split files. If the specified directory doesn't exist, it will be created automatically.
`--help`                  | `boolean` | no           | -           | Show help
`--version`               | `boolean` | no           | -           | Show version number

## Example

```bash request
openapi split pet.yaml --outDir=openapi
```

```bash output
Document: pet.yaml is successfully split
 and all related files are saved to the directory: openapi 

pet.yaml: split processed in 33ms
```

In the `openapi` directory, the `split` command "unbundles" the specified API definition. Code samples, components, and paths are split from the root definition into separate files and folders. The structure of the unbundled directory corresponds to the structure created by our [Create OpenAPI repo](https://github.com/Redocly/create-openapi-repo) tool.
