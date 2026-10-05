# @redocly/recheck

The Markdown and prose linting engine behind `redocly recheck`.

Use it through Redocly CLI.
Configure it in the `recheck` block of `redocly.yaml`, and name presets in the root `extends`:

```yaml
extends:
  - recommended
  - recheck/markdown
recheck:
  rules:
    recheck/line-length: off
```

Run it with `npx @redocly/cli recheck`.
Its documentation is the [Markdown and prose linting](../../docs/@v2/recheck/index.md) section and the [recheck command page](../../docs/@v2/commands/recheck.md).

Two agent skills for AI coding assistants ship in [`skills/`](./skills): `recheck-lint` runs the command on touched Markdown, and `recheck-config` tunes the `recheck` block.
Install them with `npx skills add https://redocly.com`, or copy them from `node_modules/@redocly/recheck/skills/` into your project's `.claude/skills/`.
The repository keeps the same files under [`.claude/skills/`](../../.claude/skills), which is where the website publishes them from, so change both copies together.

## Programmatic use

The package exports the engine for tools that embed it:

- `@redocly/recheck/presets` exports the presets as a plugin, `recheckPresetsPlugin`.
  Pass it in `plugins` to `loadConfig` or `createConfig` of `@redocly/openapi-core`, and read the merged block from `config.recheck`.
- `resolveRecheckConfig({ block, configDir })` turns a resolved `recheck` block into normalized rules.
- `lintFiles` and `lintContent` run those rules over files or strings.
- `runLint`, `generateBaseline`, `runReadability`, and `generateMarkdocSchema` are the actions the CLI command calls.
  Each action returns a result object.
  The CLI prints it.
  `runLint`, `generateBaseline`, and `runReadability` accept one path or a list of paths.
- `parseMarkdown`, `extractScopes`, and `applyFixesToContent` expose the parser, the scope extractor, and the fixer.

The package depends on `@redocly/openapi-core` for the `Plugin` type of the presets entry.

The standalone `recheck` binary and the `recheck.yaml` file are not part of this package.

## Configuration

### Opt-in prose assertions

`conditional`, `metric`, and `spelling` have no single right default.
Add them explicitly under `recheck.rules`.

`metric` scores the prose of a whole file and reports once when the score is outside `min` and `max`.
Its `formula` is a readability formula (`flesch-reading-ease`, `flesch-kincaid-grade`, `gunning-fog`, `smog`, `coleman-liau`, `automated-readability`) or a size formula (`word-count`, `sentence-count`, `reading-time`).
`reading-time` is minutes at `wordsPerMinute`, default 200, rounded to one decimal.
Size formulas count what a person reads: code blocks, front matter, headings, and Markdoc tags are left out.
Use one as a page-size budget, such as a word cap on agent skills:

```yaml
extends:
  - recheck/markdown
recheck:
  rules:
    recheck/tbd-needs-tracking-link:
      severity: warn
      message: '"%s" appears but "%s" was never introduced.'
      assertions:
        conditional:
          first: '\bTBD\b'
          second: 'https://github\.com/\S+/issues/\d+'
    recheck/readability-floor:
      severity: warn
      message: 'Readability (%s) is %s; expected between %s and %s.'
      assertions:
        metric:
          formula: flesch-reading-ease
          min: 30
    recheck/skill-size-budget:
      severity: error
      message: 'Document %s is %s; expected between %s and %s.'
      appliesTo:
        - '.claude/skills/**/SKILL.md'
      assertions:
        metric:
          formula: word-count
          max: 1500
    recheck/us-spelling-check:
      severity: warn
      message: 'Unknown word "%s"%s'
      assertions:
        spelling:
          vocab: [Redocly, Reunite]
```

## How to contribute

See the [Recheck engine](../../CONTRIBUTING.md#recheck-engine) section of the root contributing guide.
