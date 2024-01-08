# `preview`

## Introduction

The `preview` command starts a preview server for a Redocly project.

## Usage

```bash
redocly preview
redocly preview --product=revel
redocly preview --product=reef --plan=pro
redocly preview --product=reef --plan=pro --source-dir=./my-docs-project --port=4001
```

## Options

| Option       | Type    | Description                                                                                                                                                                           |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --help       | boolean | Shows help.                                                                                                                                                                           |
| --plan       | string  | Product plan to use in preview. <br/> **Possible values:** `pro`, `enterprise`. The default value is `enterprise`.                                                                    |
| --product    | string  | Name of a project to preview the product with. <br/> **Possible values:** `redoc`, `revel`, `reef`, `realm`, `redoc-revel`, `redoc-reef`, `revel-reef`. The default value is `realm`. |
| --source-dir | string  | Path to the project directory. The default value is `.` (current directory).                                                                                                          |
| --port       | number  | The port to run the preview server on. The default value is `4000`.                                                                                                                   |
| --version    | boolean | Shows version number.                                                                                                                                                                 |

## Examples

### Select a product for preview

Instead of inferring the product package to use for preview from `package.json` or using Realm by default, you can specify the product package as an argument.

```bash
redocly preview --product=revel
```

### Select a plan for preview

By default, the preview is run in an enterprise plan mode. This makes all of the enterprise features available.
Alternatively, you can run the preview with a professional plan.

```bash
redocly preview --plan=pro
```

### Specify project directory

By default, the preview command uses the current directory. To specify another directory, provide a path to it relative to the current directory:

```bash
redocly preview --source-dir=./path/to/my/docs/
```

### Custom port for preview

By default, without using the `port` option, the preview starts on port `4000`, so you can access the docs at `http://localhost:4000` or `http://127.0.0.1:4000`.

To specify a custom port for the preview, pass the desired value using a `port` option:

```bash
redocly preview --port=8080
```
