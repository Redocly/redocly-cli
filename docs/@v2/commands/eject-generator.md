# `eject-generator`

## Introduction

The `eject-generator` command copies a built-in client generator into your repository as editable source.
You own the ejected generator and can customize it.
The generated client stays generated and reproducible.
Do not edit it manually.
You or your agent edit the generator, and the `redocly generate-client` command rebuilds the client.
When the spec changes later, the command regenerates the client and keeps your customization.

You can eject every built-in generator: the SDKs (`typescript`, `python`, `go`, `php`) and the add-on generators (`zod`, `mock`, `cli`, `swr`, `tanstack-query`, `transformers`).
A generator that writes reference documentation carries that page with it, so ejecting `cli` or `python` also hands you the layout of its page.
The `tanstack-query-vue`, `-svelte`, and `-solid` variants are the same generator with one different argument.
Eject `tanstack-query` and set the framework in your copy.

## Usage

```bash
redocly eject-generator python
redocly eject-generator zod --dir ./generators
redocly eject-generator php --update
redocly eject-generator php --force
```

## Options

| Option     | Type    | Description                                                                                                                        |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| generator  | string  | The built-in generator to eject.                                                                                                   |
| `--config` | string  | The path to the config file.                                                                                                       |
| `--dir`    | string  | The directory that receives the ejected copy. Default: `./generators`.                                                             |
| `--update` | boolean | Do a three-way merge of the current built-in version into your customized copy. The command marks conflicts with standard markers. |
| `--force`  | boolean | Overwrite an existing ejected copy and discard the local edits.                                                                    |

## How it works

The eject operation writes the generator and its design:

- Every generator ejects as `<dir>/<name>/` — its TypeScript source folder, exactly as it was written.
  Each concern of the generator is one file, and `index.ts` is the entry.
  Running an ejected generator uses Node's own type stripping, which requires Node 22.18, 23.6, or newer.

  The generator imports the authoring toolkit from `@redocly/client-generator`.
  Some generators also import `logger` or `isPlainObject` from `@redocly/openapi-core`, which is a dependency of the toolkit; the command tells you when yours does.
  If your package manager does not hoist dependencies, add `@redocly/openapi-core` explicitly.

- `.claude/skills/<name>-generator/SKILL.md` is the design of the generator, written as an agent skill.
  The skill records the decisions that the code implements, and the loop to follow when you change the generator.
  First state the change in the skill, then make the code match.
  Coding agents load skills automatically, so your agent starts from the design and does not reverse-engineer the code.

The first eject also writes `.claude/skills/client-generators/SKILL.md`, the shared authoring guide.
The guide describes the generator contract, the API model, and the helper library.
You can edit the skills, in the same way as the generator.
The `--update` option does a three-way merge of your skill edits with the newer version.
A fresh eject or `--force` writes the skills as Redocly ships them.

In addition to the code, the command also writes a short pointer to the skills into `<dir>/AGENTS.md`.
This pointer explains the directory to a reader who has no context.
The command keeps everything that you add outside the markers in that file.

The eject command also configures your project.
It adds `@redocly/client-generator` to your `devDependencies` if the package is not there.
It also points your config at the ejected copy: in `client.generators`, the path to your copy replaces the built-in name.
If the config has no `client.generators` list yet, the command adds one.

```yaml
client:
  generators:
    - ./generators/python/index.ts
```

If you leave the ejected generator unmodified, its output is byte-identical to the output of the built-in generator.
To roll back, delete the ejected copy and the config line.

## Run the ejected generator

Generation is the same command as before the eject, because the config now points at your copy:

```sh
redocly generate-client openapi.yaml --output src/client.ts
```

If you did not wire the config, name your copy with `--generator`:

```sh
redocly generate-client openapi.yaml --output src/client.ts --generator ./generators/python/index.ts
```

The command reports a generator that takes over a built-in name, so you can see that your copy is the one that runs.
Edit your copy and run the command again to see the change.
The eject command prints these instructions as well.

## Update an ejected generator

The `redocly eject-generator <name> --update` command merges a newer version into your copy.
That version is the one shipped by your installed `@redocly/client-generator` package.
The three-way merge uses the version recorded in the header of each ejected file as the common ancestor, and a folder generator merges file by file.
Because of this, you do not have to commit extra files, and there is no snapshot to keep in sync.

The command merges the two skills in the same way, so an update keeps the design notes that you added to them.
The command marks conflicts with standard `<<<<<<<` markers.
Resolve the conflicts manually.

An ejected generator continues to operate across CLI upgrades if the authoring contract that it was written against stays compatible.
The contract follows the `@redocly/client-generator` version.
A breaking change increases the major version (the minor version, while the package is `0.x`).
A generator ejected from an incompatible version fails before it runs.
The error displays the version that the generator expects, the version that you have, and the `--update` command that aligns them.
