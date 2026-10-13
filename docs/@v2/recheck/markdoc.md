---
seo:
  title: Lint Markdoc tags with Recheck
  description: Turn on Markdoc-aware parsing in Recheck, validate tags against a schema, and generate a tag schema from a theme.
---

# Markdoc tags

Redocly projects write Markdown with [Markdoc](https://markdoc.dev) tags such as `{% admonition type="info" %}`.
Recheck parses those tags when you turn Markdoc parsing on, and the [`recheck/markdoc` preset](./presets.md#recheckmarkdoc) validates them.

Markdoc parsing is off by default, because Liquid and Jinja templates use the same `{% %}` delimiters for unrelated syntax.

## Turn on Markdoc parsing

Set `markdoc: true` in the `recheck` block and add the preset:

```yaml
extends:
  - recheck/markdown
  - recheck/markdoc
recheck:
  markdoc: true
```

`markdoc: true` is the short form of `markdoc: { schema: realm }`, which validates tags against the built-in schema of the Realm theme.

The preset's four rules only report when parsing is on.
With the preset but without `markdoc`, the command prints a warning that the rules can never report.

To write _about_ Markdoc syntax, wrap the literal tag in a code span, such as `` `{% partial /%}` ``.
A code span never parses as a tag.

## Choose or extend the schema

The object form picks the schema and adds your own tags:

```yaml
recheck:
  markdoc:
    schema: realm
    extend:
      tagsFile: ./markdoc-tags.yaml
      tags:
        raw-partial:
          selfClosing: true
          attributes:
            file:
              type: string
              required: true
```

| Key               | Description                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `schema`          | **Required.** `realm` validates tags against the built-in Realm schema. `false` parses and pairs tags without a schema check. |
| `extend.tags`     | Your own tags, merged over the schema.                                                                                        |
| `extend.tagsFile` | A YAML file of tags, relative to `redocly.yaml`. Inline `tags` win over it. Set `tags`, `tagsFile`, or both.                  |

With `schema: false`, tag pairing and the `markdoc.tag` scope still work, and `markdoc-syntax` and `markdoc-pairing` still report.
Only `markdoc-unknown-tag` and `markdoc-attributes` go quiet, because there is no schema to check against.

Tags merge in the order built-in schema, then `tagsFile`, then inline `tags`.
A tag defined twice is replaced whole, not merged attribute by attribute.

A `tagsFile` that does not exist, is not valid YAML, or holds an invalid tag entry is a configuration error.
The run fails rather than silently skipping the Markdoc checks.

### Tag schema shape

Each tag has these keys:

```yaml
tag-name:
  selfClosing: true
  attributes:
    level:
      type: string
      required: true
      default: info
      enum: [info, warning, danger]
```

| Key                          | Type     | Description                                              |
| ---------------------------- | -------- | -------------------------------------------------------- |
| `selfClosing`                | boolean  | The tag is written as `{% tag /%}` and has no close tag. |
| `attributes.<name>.type`     | string   | **Required.** `string`, `number`, or `boolean`.          |
| `attributes.<name>.required` | boolean  | The attribute must be present.                           |
| `attributes.<name>.default`  | any      | The default value.                                       |
| `attributes.<name>.enum`     | [string] | The allowed values.                                      |
| `attributes.<name>.dynamic`  | boolean  | The value is computed, so only its presence is checked.  |

## Generate a tags file from a theme

A project that defines tags in a theme module, such as `@theme/markdoc/schema.ts`, can generate the tags file instead of writing it by hand:

```bash
redocly recheck --generate-markdoc-schema --from=@theme/markdoc/schema.js --output=markdoc-tags.yaml
```

| Option     | Description                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--from`   | A module that exports `tags`, as a named export or on the default export. Repeat it to merge several modules. Paths are relative to the working directory. |
| `--output` | Where to write the YAML file.                                                                                                                              |
| `--check`  | Compare the file in `--output` with a fresh generation and fail if it differs, without writing. Use it in CI.                                              |

The command extracts the parts of each tag it can check statically: `selfClosing`, and each attribute's `type`, `required`, `default`, and `enum`.
An attribute with a custom class or a `validate` function is written as `dynamic: true`.
Two modules that define the same tag with different shapes fail the command, so the merge never picks one by flag order.

The command imports each module with Node.js, so the module must be JavaScript.
Compile a TypeScript module first, or run the CLI under a loader such as `tsx`.

The generated file opens with a header that names its source modules and the command to regenerate it.
Commit the file and point `extend.tagsFile` at it.

## How Markdoc parsing changes other rules

Turning `markdoc` on changes how every rule sees a tag, not only the Markdoc rules:

- **Prose scopes leave the tag out.**
  `paragraph`, `heading`, `list-item`, `blockquote`, and table cell scopes blank out the `{% ... %}` span before a rule runs, with the same width, so a `swap` or `pattern` match cannot fire on tag syntax, and a `length` count does not include it.
  A heading or cell whose whole text is a tag produces no segment.
- **`--fix` never rewrites a tag.**
  A fix that would change the bytes of a tag is withheld and reported as a skipped fix.
- **Indented code blocks and setext headings are off.**
  Markdoc's own parser does not recognize them, and Realm renders them as prose, so Recheck matches that while the flag is on.
  A `{% table %}` line followed by `---` is a table row, not a heading.
  Expect `heading-style`, `blanks-around-headings`, `capitalization`, and `code-block-style` findings to move the first time you turn the flag on.
