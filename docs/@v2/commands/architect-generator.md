# `architect-generator`

## Introduction

The `architect-generator` command creates a custom client-generator skeleton — for emitting an artifact no built-in generator covers (a route map, a facade, an SDK in another language).
It also drops `AGENTS.md`, the authoring guide that teaches your coding agent the generator contract, the API model shape, and the language-neutral helpers.

## Usage

```bash
redocly architect-generator route-map
redocly architect-generator my-sdk --dir ./generators
```

## Options

| Option    | Type   | Description                                                          |
| --------- | ------ | -------------------------------------------------------------------- |
| generator | string | Name for the new generator (kebab-case; built-in names are refused). |
| `--dir`   | string | Directory to architect into. Default `./generators`.                 |

## How it works

The skeleton is a runnable generator: it walks every operation of the API description and emits one file.
Replace its body with your output logic — the `Printer`, naming, and schema helpers from `@redocly/client-generator` (installed once as a dev dependency) handle indentation, identifier sanitization, and schema semantics in any output language.

```yaml
client:
  generators:
    - sdk
    - ./generators/route-map.mjs
```

To vendor and customize a built-in language generator instead, use [`eject-generator`](./eject-generator.md).
