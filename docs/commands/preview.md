# `preview`

## Introduction

The `preview` command starts a local preview server for a Redocly project. Use the preview server to develop your project locally before deployment.

{% admonition type="warning" name="Pre-release" %}
This command is for our pre-release products, currently open for early access to a small number of users. Announcements about the release are made through our [mailing list](https://redocly.com/product-updates/).
{% /admonition %}

## Usage

```bash
redocly preview
redocly preview --product=revel
redocly preview --product=reef --plan=pro
redocly preview --product=reef --plan=pro --source-dir=./my-docs-project --port=4001
```

## Options

| Option           | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --help           | boolean | Show help.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --plan           | string  | Product plan to use in preview. <br/> **Possible values:** `pro`, `enterprise`. The default value is `enterprise`. For more details, see [plans](https://redocly.com/pricing/).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --product        | string  | Name of a product to preview the project with. <br/> **Possible values:** `redoc`, `revel`, `reef`, `realm`, `redoc-revel`, `redoc-reef`, `revel-reef`. <br/> `redoc` is the flagship product for generating API documentation from OpenAPI specifications. <br/> `revel` is a specialized product designed for external API applications. <br/> `reef` is a specialized product designed for internal API needs. <br/> `realm` is a balanced product combining `redoc`, `revel`, and `reef`. <br/> `redoc-revel` is a blended product combining `redoc` and `revel`. <br/> `redoc-reef` is a blended product combining `redoc` and `reef`. <br/> `revel-reef` is a blended product combining `revel` and `reef`. <br/> The default value is autodetected from the project's `package.json` or `realm` is used. |
| --source-dir, -d | string  | Path to the project directory. The default value is `.` (current directory).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --port           | number  | The port to run the preview server on. The default value is `4000`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --version        | boolean | Show version number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Examples

### Select a product for preview

Specify the product package to use by setting the `--product` option.
If this setting is not supplied, the preview command tries to guess which package to use from the project's `package.json` or use `realm` by default.

```bash
redocly preview --product=revel
```

### Select a plan for preview

By default, previews are run in enterprise plan mode. This mode makes all of the enterprise features available.
Switch the preview to pro plan mode by setting the `--plan` option to `pro`:

```bash
redocly preview --plan=pro
```

### Specify project directory

By default, the preview command uses the current directory. To specify another directory, provide a path relative to the current directory using the `--source-dir` option:

```bash
redocly preview --source-dir=./path/to/my/docs/
```

### Use custom port for preview

By default, the preview starts on port `4000`, so you can access the docs at `http://localhost:4000` or `http://127.0.0.1:4000`.

To specify a custom port for the preview, pass the desired value using the `port` option:

```bash
redocly preview --port=8888
```

This command starts the preview on port 8888, so you can access the docs at `http://localhost:8888` or `http://127.0.0.1:8888`.
