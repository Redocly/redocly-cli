# `preview`

## Introduction

The `preview` command starts a local preview server for a Redocly project. Use the preview to develop your project locally before deployment.

{% admonition type="info" name="Pre-release" %}
This command is for our pre-release products, currently open for early access to a small number of users. Announcements regarding the release will be made through our [mailing list](https://redocly.com/product-updates/).
{% /admonition %}

## Usage

```bash
redocly preview
redocly preview --product=revel
redocly preview --product=reef --plan=pro
redocly preview --product=reef --plan=pro --source-dir=./my-docs-project --port=4001
```

## Options

| Option           | Type    | Description                                                                                                                                                                                                                                     |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --help           | boolean | Shows help.                                                                                                                                                                                                                                     |
| --plan           | string  | Product plan to use in preview. <br/> **Possible values:** `pro`, `enterprise`. The default value is `enterprise`.                                                                                                                              |
| --product        | string  | Name of a project to preview the product with. <br/> **Possible values:** `redoc`, `revel`, `reef`, `realm`, `redoc-revel`, `redoc-reef`, `revel-reef`. The default value is autodetected from the project's `package.json` or `realm` is used. |
| --source-dir, -d | string  | Path to the project directory. The default value is `.` (current directory).                                                                                                                                                                    |
| --port           | number  | The port to run the preview server on. The default value is `4000`.                                                                                                                                                                             |
| --version        | boolean | Shows version number.                                                                                                                                                                                                                           |

## Examples

### Select a product for preview

Specify the product package to use by setting a `--product` argument.
If this setting is not supplied, the preview command tries to guess which package to use from the project's `package.json` or use `realm` by default.

```bash
redocly preview --product=revel
```

### Select a plan for preview

Previews are run in enterprise plan mode by default. This mode makes all of the enterprise features available.
Switch the preview to professional plan mode by setting `--plan` to `pro`.

```bash
redocly preview --plan=pro
```

### Specify project directory

The preview command uses the current directory by default. To specify another directory, provide a path to it relative to the current directory:

```bash
redocly preview --source-dir=./path/to/my/docs/
```

### Custom port for preview

The preview starts on port `4000` by default, so you can access the docs at `http://localhost:4000` or `http://127.0.0.1:4000`.

To specify a custom port for the preview, pass the desired value using a `port` option:

```bash
redocly preview --port=8080
```
