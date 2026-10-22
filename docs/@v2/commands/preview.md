# `preview`

## Introduction

The `preview` command starts a local preview server for a Redocly project with the `@redocly/framework` package.
A project whose `package.json` lists a legacy product package, such as `@redocly/realm`, previews with that package instead.
Use the preview server to develop your project locally before deployment.

## Usage

```bash
redocly preview
redocly preview --plan=pro
redocly preview --plan=scale --project-dir=./my-docs-project --port=4001
```

## Options

| Option            | Type    | Description                                                                                                                                                                                       |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --help            | boolean | Show help.                                                                                                                                                                                        |
| --plan            | string  | Plan whose features the preview enables. <br/> **Possible values:** `pro`, `scale`, `enterprise`. The default value is `enterprise`. For more details, see [plans](https://redocly.com/pricing/). |
| --project-dir, -d | string  | Path to the project directory. The default value is `.` (current directory).                                                                                                                      |
| --port, -p        | number  | The port to run the preview server on. The default value is `4000`.                                                                                                                               |

## Examples

### Select a plan for preview

By default, previews run in enterprise plan mode, which makes every feature available.
Switch the preview to the Pro or Scale plan by setting the `--plan` option, so you see exactly what that plan includes:

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
The preview command uses npx internally to launch `@redocly/framework`, and a cached package can sometimes cause issues.

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
