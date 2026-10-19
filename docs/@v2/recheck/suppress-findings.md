---
seo:
  title: Suppress Recheck findings
  description: Limit which files and lines a Recheck rule reports, with excludes, exceptions, inline directives, and a baseline.
---

# Suppress findings

Fix the content first.
When a finding is a true positive that must stay as written, or the content is generated or frozen, Recheck offers four ways to keep the rule on and quiet it where it does not apply.
In order of preference:

1. **File targeting** in the configuration, with `appliesTo`, `excludes`, and `exceptions.files`, for generated or frozen files.
2. **Line exceptions** in the configuration, with `exceptions.lines`, for a recurring line that must stay as written.
3. **Inline directives** in the Markdown file, for a single line or region.
4. **A baseline**, to adopt a rule on a large document set before every existing finding is fixed.

## File targeting

Every rule accepts three lists of file globs:

| Key                | Effect                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| `appliesTo`        | The rule runs only on files that match. Default: every Markdown file.             |
| `excludes`         | The rule skips files that match.                                                  |
| `exceptions.files` | The rule skips files that match. Same effect as `excludes`, kept for readability. |

The `recheck` block also has a top-level `excludes` list that every rule skips, so a folder you never lint is declared once:

```yaml
recheck:
  excludes:
    - '**/_partials/**'
    - CHANGELOG.md
  rules:
    recheck/line-length:
      severity: warn
      appliesTo:
        - 'docs/reference/**'
      assertions:
        line-length:
          lineLength: 120
    recheck/us-spelling:
      severity: error
      message: 'Use the US spelling "%s" instead of "%s".'
      excludes:
        - 'docs/archive/**'
      assertions:
        swap:
          pairs:
            colour: color
```

A glob matches a file when it matches the file name, the path relative to the working directory, or any trailing part of that path.
So `style-guide.md` matches that file in any folder, `docs/style-guide.md` matches one path, and `docs/**` matches everything under `docs`.

## Line exceptions

`exceptions.lines` lists text fragments.
A line that contains any fragment is skipped by the rule.
Matching is case-sensitive.

```yaml
recheck:
  rules:
    recheck/us-spelling:
      severity: error
      message: 'Use the US spelling "%s" instead of "%s".'
      assertions:
        swap:
          pairs:
            colour: color
      exceptions:
        lines:
          - 'British spellings such as'
```

## Inline directives

An HTML comment in the Markdown file turns rules off for a line, a region, or the whole file.
Name a rule by its full key or by the short name the report prints, and separate several names with spaces.
A directive without names applies to every rule.

```markdown
<!-- recheck-disable-next-line recheck/line-length -->

This one long line is exempt from the line length rule; the rest of the file is not.

<!-- recheck-disable google/no-via microsoft/az-navigation -->

These two rules are off from here on.

<!-- recheck-enable google/no-via -->

The Microsoft rule is still off; the Google rule is back on.

<!-- recheck-disable -->

Nothing is checked from here on.

<!-- recheck-enable -->

Checking resumes here.
```

| Directive                                    | Effect                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `<!-- recheck-disable-next-line [rules] -->` | Turns the rules off for the next line only.                                                      |
| `<!-- recheck-disable [rules] -->`           | Turns the rules off from this line to the end of the file, or until a matching `recheck-enable`. |
| `<!-- recheck-enable [rules] -->`            | Turns the rules back on from this line.                                                          |
| `<!-- recheck-disable-file -->`              | Turns every rule off for the whole file, wherever the comment sits.                              |

A directive must be real HTML in the document.
Inside a fenced code block it is text, and it does nothing.

A directive that names a rule the configuration does not have disables nothing.
The command reports it as a `recheck-directive` warning on the directive's line, so a typo in a rule name is visible.

## Use a baseline

A baseline lets a team adopt Recheck on a large document set without fixing every existing finding first.
It records the errors that exist today, and later runs fail only on new ones.

Generate it from the folder you lint:

```bash
redocly recheck docs --generate-baseline
```

The command writes `.redocly.recheck-baseline.yaml` next to `redocly.yaml`.
Commit the file.
Every later run finds it by its presence; no configuration key is needed.

The file stores one count per file per rule, for errors only, with sorted keys so that diffs stay stable:

```yaml
# Generated by `redocly recheck --generate-baseline`. Do not edit by hand.
version: 1
files:
  docs/index.md:
    recheck/single-h1: 1
  docs/guides/intro.md:
    recheck/line-length: 3
```

With a baseline in place, a run:

- **suppresses** an error when the count for its file and rule is within the baseline, and prints how many findings matched;
- **fails** when a count rises, and prints the group's findings with `(baseline 3, found 5)` added to the message;
- **fails** when a count falls, because the baseline is stale.
  Regenerate it and commit the smaller file, so the baseline equals reality at every green commit.

Warnings and info findings are never baselined.
A run on a narrower path, or with `--rule`, compares only the files it scanned and the rules it ran, so it never reports a stale entry it could not see.
Line numbers are not stored, so a baseline survives unrelated edits, and its diff in a pull request reads as "this change pays down four findings".

A renamed file is a new path with no budget, so its old findings report as new until you regenerate the baseline.
