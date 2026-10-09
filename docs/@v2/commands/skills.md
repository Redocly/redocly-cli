# `skills`

## Introduction

The `skills` command installs the Redocly CLI agent skills into your project.
Agent skills teach AI coding agents, such as Claude Code, Codex, and Cursor, how to work with Redocly CLI.

The skills ship inside Redocly CLI, so the command works offline.
The installed skills always match your installed version of Redocly CLI.

The command installs only the skills for Redocly CLI:

- `redocly-cli`: day-to-day usage, such as lint, bundle, build docs, test, and generate a client.
- `redocly-lint-rules`, best for [migration from Spectral](../guides/migrate-from-spectral.md): turn a check written in plain language into a built-in rule, a configurable rule, or a custom plugin.
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
| --list   | boolean  | List the bundled skills without installing them.                                                                                  |
| --help   | boolean  | Show help.                                                                                                                        |

## Supported agents

The command always writes the skills to `.agents/skills/`.
Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, and many other agents read this folder.

Claude Code, Windsurf, Kiro, Continue, Roo Code, Goose, Junie, and Augment read only their own folder.
The command also writes the skills to the folder of each of these agents that you name with `--agent`, or that it detects.
It detects an agent when the agent folder exists in the project or in your home folder.
For example, if `~/.claude` exists, the command writes the skills to `.claude/skills/`.

With `--global`, the command writes to the home folder.

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
