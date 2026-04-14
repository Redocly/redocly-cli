# `preview`

## Introduction

The `preview` command starts a local preview server for a Redocly project.
Use the preview server to develop your project locally before deployment.

## Usage

```bash
redocly preview
redocly preview --product=revel
redocly preview --product=reef --plan=pro
redocly preview --product=reef --plan=pro --project-dir=./my-docs-project --port=4001
```

## Options

| Option            | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --help            | boolean | Show help.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --plan            | string  | Product plan to use in preview. <br/> **Possible values:** `pro`, `enterprise`. The default value is `enterprise`. For more details, see [plans](https://redocly.com/pricing/).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --product         | string  | Name of a product to preview the project with. <br/> **Possible values:** `redoc`, `revel`, `reef`, `realm`, `redoc-revel`, `redoc-reef`, `revel-reef`. <br/> `redoc` is the flagship product for generating API documentation from OpenAPI specifications. <br/> `revel` is a specialized product designed for external API applications. <br/> `reef` is a specialized product designed for internal API needs. <br/> `realm` is a balanced product combining `redoc`, `revel`, and `reef`. <br/> `redoc-revel` is a blended product combining `redoc` and `revel`. <br/> `redoc-reef` is a blended product combining `redoc` and `reef`. <br/> `revel-reef` is a blended product combining `revel` and `reef`. <br/> The default value is autodetected from the project's `package.json` or `realm` is used. |
| --project-dir, -d | string  | Path to the project directory. The default value is `.` (current directory).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --port, -p        | number  | The port to run the preview server on. The default value is `4000`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --version         | boolean | Show version number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Examples

### Select a product for preview

Specify the product package to use by setting the `--product` option.
If this setting is not supplied, the preview command tries to guess which package to use from the project's `package.json` or use `realm` by default.

```bash
redocly preview --product=revel
```

### Select a plan for preview

By default, previews are run in enterprise plan mode.
This mode makes all of the enterprise features available.
Switch the preview to pro plan mode by setting the `--plan` option to `pro`:

```bash
redocly preview --plan=pro
```

### Specify project directory

By default, the preview command uses the current directory.
To specify another directory, provide a path relative to the current directory using the `--project-dir` option:

```bash
redocly preview --project-dir=./path/to/my/docs/
```

### Use custom port for preview

By default, the preview starts on port `4000`, so you can access the docs at `http://localhost:4000` or `http://127.0.0.1:4000`.

To specify a custom port for the preview, pass the desired value using the `port` option:

```bash
redocly preview --port=8888
```

This command starts the preview on port 8888, so you can access the docs at `http://localhost:8888` or `http://127.0.0.1:8888`.

## Troubleshoot

### Internal Server Error

An **Internal Server Error** page when running the preview command is often caused by a corrupted or outdated npx cache.
The preview command uses npx internally to launch product packages, and cached packages can sometimes cause issues.

#### Clear the npx cache

Clear the npx cache:

```bash
npm cache clean --force
```

After clearing the cache, try running the preview command again.

#### Install Redocly CLI globally

Install Redocly CLI globally to avoid cache-related issues:

```bash
npm install -g @redocly/cli@latest
```

After installation, the `redocly` command is available globally, which helps avoid npx cache issues.
