# `eject-generator`

## Introduction

The `eject-generator` command vendors a built-in client generator into your repo as an editable file — the generator becomes yours to customize, while the _generated_ client stays machine-owned and reproducible.
Your agent (or you) edits the generator, `redocly generate-client` rebuilds the client, and next week's spec change regenerates with the customization intact.

Every built-in generator can be ejected: the language SDKs (`python`, `go`, `php`), the TypeScript `sdk`, and the satellites (`zod`, `mock`, `cli`, `swr`, `tanstack-query`, `transformers`).
The `tanstack-query-vue`, `-svelte`, and `-solid` variants are the same generator with one argument changed, so eject `tanstack-query` and set the framework in your copy.

## Usage

```bash
redocly eject-generator python
redocly eject-generator zod --dir ./generators
redocly eject-generator php --update
redocly eject-generator php --force
```

## Options

| Option     | Type    | Description                                                                                             |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------- |
| generator  | string  | Built-in generator to eject.                                                                            |
| `--dir`    | string  | Directory to eject into. Default `./generators`.                                                        |
| `--update` | boolean | Three-way merge the current built-in version into your customized copy; conflicts get standard markers. |
| `--force`  | boolean | Overwrite an existing ejected file, discarding local edits.                                             |

## How it works

Ejecting writes two things:

- `<dir>/<name>.mjs` — the generator itself, as plain ESM you own, containing everything it needs to run standalone.
  A language generator (`python`, `go`, `php`) is one self-contained file, so you get its source as we wrote it.
  A TypeScript generator is a thin entry over shared emitters, so you get it bundled with those emitters: unminified, with a comment marking each source module.
  Either way it imports the authoring toolkit from `@redocly/client-generator`, and a bundled one also imports `logger` and `isPlainObject` from `@redocly/openapi-core` — a dependency of the toolkit, worth adding explicitly if your package manager doesn't hoist.
- `.claude/skills/<name>-generator/SKILL.md` — the generator's design as an agent skill: the decisions its code implements, and the loop to follow when changing it (state the change in the skill, then make the code match).
  Coding agents load skills automatically, so your agent starts from the design instead of reverse-engineering the code.

A first eject also drops `.claude/skills/client-generators/SKILL.md` — the shared authoring guide (the generator contract, the API model, the helper library).
Both skills are ours: they are rewritten on every eject and `--update`, so keep your own notes elsewhere.
Beside the code, `<dir>/AGENTS.md` gets a short pointer to the skills, so the directory explains itself to a reader who opens it cold; anything you add outside its markers survives.

Eject wires itself up: it adds `@redocly/client-generator` to your `devDependencies` if it isn't there and points your config at the file, where a path entry takes over the built-in name.

```yaml
client:
  generators:
    - ./generators/python.mjs
```

An ejected-unmodified generator produces byte-identical output to the built-in.
To roll back, delete the file and the config line.

## Update an ejected generator

`redocly eject-generator <name> --update` merges the version shipped by your installed `@redocly/client-generator` into your copy.
The three-way merge uses the version recorded in the ejected file's header as the common ancestor, so nothing extra needs to be committed and there is no snapshot to keep in sync.
Conflicts arrive as standard `<<<<<<<` markers for you to resolve.

Ejected generators keep working across CLI upgrades as long as the authoring contract they were written against is compatible.
The contract follows the `@redocly/client-generator` version: a breaking change bumps the major version (the minor, while the package is `0.x`), and a generator ejected from an incompatible version fails upfront with the version it expects, the version you have, and the `--update` command to reconcile them.
