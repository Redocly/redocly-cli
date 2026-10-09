# `skills`

## Introduction

The `skills` command installs the Redocly CLI agent skills into your project.
Agent skills teach AI coding agents, such as Claude Code, Codex, and Cursor, how to work with Redocly CLI.

The skills ship inside Redocly CLI, so the command works offline.
The installed skills always match your installed version of Redocly CLI.

The command installs only the skills for Redocly CLI:

- `redocly-cli`: day-to-day usage, such as lint, bundle, build docs, test, and generate a client.
- `redocly-lint-rules`: turn a check written in plain language into a built-in rule, a configurable rule, or a custom plugin.
- `recheck-lint`: run `redocly recheck` on the Markdown that the agent changed and fix what it finds.
- `recheck-config`: write and tune the `recheck` block in `redocly.yaml`.

## Usage

```bash
redocly skills
redocly skills --agent claude
redocly skills --agent claude codex
redocly skills --global
redocly skills --list
```

## Options

| Option   | Type     | Description                                                                                                                       |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| --agent  | [string] | Agents to install the skills for. Without this option, the command detects the agents. See [Supported agents](#supported-agents). |
| --global | boolean  | Install the skills in your home folder instead of the current project. Default value is `false`.                                  |
| --list   | boolean  | List the bundled skills without installing them. Default value is `false`.                                                        |
| --help   | boolean  | Show help.                                                                                                                        |

## Supported agents

The command always writes the skills to `.agents/skills/`.
Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, and many other agents read this folder.

Some agents read only their own folder.
The command also writes the skills there when it detects the agent, or when you name the agent with `--agent`:

| Agent       | `--agent` value | Project folder      |
| ----------- | --------------- | ------------------- |
| Claude Code | `claude`        | `.claude/skills/`   |
| Windsurf    | `windsurf`      | `.windsurf/skills/` |
| Kiro        | `kiro`          | `.kiro/skills/`     |
| Continue    | `continue`      | `.continue/skills/` |
| Roo Code    | `roo`           | `.roo/skills/`      |
| Goose       | `goose`         | `.goose/skills/`    |
| Junie       | `junie`         | `.junie/skills/`    |
| Augment     | `augment`       | `.augment/skills/`  |

The command detects an agent when its folder exists in the project or in your home folder.
For example, if a `~/.claude` folder exists, the command installs the skills for Claude Code.

The `codex`, `cursor`, `copilot`, `gemini`, and `opencode` values are also accepted.
These agents read `.agents/skills/`, so the command writes only that folder for them.

With `--global`, the command writes to `~/.agents/skills/` and to the skills folder in the home folder of each detected or named agent, for example `~/.claude/skills/`.

## Update the skills

Run the command again after you upgrade Redocly CLI.
The command replaces the skill files that changed and reports each file as `created`, `updated`, or `unchanged`.
The command manages its own skill files, so it overwrites changes you make to them.
It does not touch other skills in the same folders.

## Install all Redocly skills

Redocly publishes all of its agent skills at `redocly.com`, including the skills for Redocly CLI.
The `skills` command installs only the skills for Redocly CLI.
To install every published skill, use the [`skills`](https://github.com/vercel-labs/skills) installer:

```bash
npx skills add https://redocly.com
```

## Related pages

- [`inspect-node-types` command](./inspect-node-types.md)
- [Recheck](../recheck/index.md)
