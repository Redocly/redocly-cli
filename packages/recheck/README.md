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
  baseline: ./recheck-baseline.yaml
```

Then run `npx @redocly/cli recheck`.
The command documentation lives at https://redocly.com/docs/cli/commands/recheck.

## Programmatic use

The package exports the engine for tools that embed it:

- `resolveRecheckConfig` turns a `recheck` block and a list of preset names into normalized rules.
- `lintFiles` and `lintContent` run those rules over files or strings.
- `runLint`, `generateBaseline`, `runReadability`, and `generateMarkdocSchema` are the actions the CLI command calls.
  Each takes a `Logger`.
- `parseMarkdown`, `extractScopes`, and `applyFixesToContent` expose the parser, the scope extractor, and the fixer.

The standalone `recheck` binary and the `recheck.yaml` file are not part of this package.

### Opt-in prose assertions

`conditional`, `metric`, and `spelling` have no single right default, so add them explicitly under `recheck.rules`:

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
    recheck/us-spelling-check:
      severity: warn
      message: 'Unknown word "%s"%s'
      assertions:
        spelling:
          vocab: [Redocly, Reunite]
```

## How to contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md).
