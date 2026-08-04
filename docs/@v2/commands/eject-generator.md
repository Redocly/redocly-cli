# `eject-generator`

## Introduction

The `eject-generator` command vendors a built-in client generator into your repo as an editable file — the generator becomes yours to customize, while the _generated_ client stays machine-owned and reproducible.
Your agent (or you) edits the generator, `redocly generate-client` rebuilds the client, and next week's spec change regenerates with the customization intact.

Ejectable generators: `python`, `go`, `php` — the language generators built on the language-neutral authoring toolkit.
The TypeScript `sdk` and its satellite generators are customized through `client.setup`, middleware, and configuration instead; running `eject-generator sdk` prints that guidance.

## Usage

```bash
redocly eject-generator python
redocly eject-generator go --dir ./generators
redocly eject-generator php --update
redocly eject-generator php --force
```

## Options

| Option     | Type    | Description                                                                                          |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------- |
| generator  | string  | Built-in generator to eject: `python`, `go`, or `php`.                                               |
| `--dir`    | string  | Directory to eject into. Default `./generators`.                                                     |
| `--update` | boolean | Three-way merge a newer generator version into your customized copy; conflicts get standard markers. |
| `--force`  | boolean | Overwrite an existing ejected file, discarding local edits.                                          |

## How it works

Ejecting writes four things:

- `<dir>/<name>.mjs` — the generator, the exact code the built-in runs, readable plain ESM.
- `<dir>/.pristine/<name>.mjs` — a pristine snapshot (commit it); `--update` uses it as the merge base.
- `<dir>/AGENTS.md` — the generator-authoring guide for your coding agent (the contract, the model shape, the helper library), shared by every ejected generator and marker-delimited so your own additions survive refreshes.
- `<dir>/<name>.AGENTS.md` — this generator's own design doc: the decisions its code implements and the modify loop (edit the design first, then make the code match).
  It's dropped once and then it's yours — evolve it with your customizations.

The ejected file imports the authoring toolkit, so install it once:

```bash
npm install --save-dev @redocly/client-generator
```

Then point your config at the file — a path entry takes over the built-in name:

```yaml
client:
  generators:
    - ./generators/python.mjs
```

An ejected-unmodified generator produces byte-identical output to the built-in.
To roll back, delete the file and restore the config line.
Not ejected means managed: without ejecting, generator improvements arrive via `npm update` with nothing to merge.
