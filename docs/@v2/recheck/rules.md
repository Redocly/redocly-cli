---
seo:
  title: Recheck Markdown rules
  description: Every structural Markdown rule that the recheck command ships, with its options.
---

# Markdown rules

Markdown rules check the structure and formatting of a file: headings, lists, links, images, tables, code fences, and whitespace.
Recheck ports every built-in [markdownlint](https://github.com/DavidAnson/markdownlint) rule and adds a few of its own.
The [`recheck/markdown` preset](./presets.md#recheckmarkdown) turns the 53 ported rules on at `error`.

A Markdown rule is configured under its key in the `recheck` block.
The key of a preset rule is `recheck/<rule>`, and the rule's options go under the assertion of the same name:

```yaml
extends:
  - recheck/markdown
recheck:
  rules:
    recheck/line-length:
      severity: warn
      assertions:
        line-length:
          lineLength: 120
          codeBlocks: false
    recheck/ul-style: off
```

A rule that is not in any preset is added the same way.
The `message` is optional for a Markdown rule, because each rule has its own:

```yaml
recheck:
  rules:
    recheck/list-length:
      severity: warn
      assertions:
        list-length:
          min: 2
          max: 10
```

## Rules in the markdown preset

The table lists each rule with its markdownlint id and whether `--fix` can repair it.
Options are listed after the table.

### Document headings

| Rule                           | markdownlint | Fixable | Checks                                                                          |
| ------------------------------ | ------------ | ------- | ------------------------------------------------------------------------------- |
| `heading-increment`            | MD001        | No      | Heading levels increase by one level at a time.                                 |
| `heading-style`                | MD003        | No      | One heading style (ATX, closed ATX, or setext) across the file.                 |
| `no-missing-space-atx`         | MD018        | Yes     | A space after the `#` of a heading.                                             |
| `no-multiple-space-atx`        | MD019        | Yes     | One space after the `#` of a heading.                                           |
| `no-missing-space-closed-atx`  | MD020        | Yes     | Spaces inside the hashes of a closed ATX heading.                               |
| `no-multiple-space-closed-atx` | MD021        | Yes     | One space inside the hashes of a closed ATX heading.                            |
| `blanks-around-headings`       | MD022        | Yes     | Blank lines around headings.                                                    |
| `heading-start-left`           | MD023        | Yes     | Headings start at the beginning of the line.                                    |
| `no-duplicate-heading`         | MD024        | No      | No two headings with the same text.                                             |
| `single-h1`                    | MD025        | No      | One top-level heading per file. Alias: `single-title`.                          |
| `no-trailing-punctuation`      | MD026        | Yes     | No trailing punctuation in a heading.                                           |
| `no-emphasis-as-heading`       | MD036        | No      | Emphasis is not used in place of a heading.                                     |
| `first-line-h1`                | MD041        | No      | The first line of the file is a top-level heading. Alias: `first-line-heading`. |
| `required-headings`            | MD043        | No      | The file follows a required heading structure.                                  |

### Whitespace and lines

| Rule                      | markdownlint | Fixable | Checks                                     |
| ------------------------- | ------------ | ------- | ------------------------------------------ |
| `no-trailing-spaces`      | MD009        | Yes     | No trailing spaces at the end of a line.   |
| `no-hard-tabs`            | MD010        | Yes     | No hard tabs.                              |
| `no-multiple-blanks`      | MD012        | Yes     | No consecutive blank lines.                |
| `line-length`             | MD013        | No      | Lines stay within a length.                |
| `single-trailing-newline` | MD047        | Yes     | The file ends with one newline.            |
| `hr-style`                | MD035        | No      | One horizontal rule style across the file. |

### Lists

| Rule                  | markdownlint | Fixable | Checks                                                   |
| --------------------- | ------------ | ------- | -------------------------------------------------------- |
| `ul-style`            | MD004        | Yes     | One bullet style (`-`, `*`, or `+`) for unordered lists. |
| `list-indent`         | MD005        | Yes     | Items at the same level share the same indentation.      |
| `ul-indent`           | MD007        | Yes     | Nested unordered lists indent by a fixed width.          |
| `ol-prefix`           | MD029        | Yes     | Ordered list numbers follow one style.                   |
| `list-marker-space`   | MD030        | Yes     | A fixed number of spaces after a list marker.            |
| `blanks-around-lists` | MD032        | Yes     | Blank lines around lists.                                |

### Code

| Rule                   | markdownlint | Fixable | Checks                                                        |
| ---------------------- | ------------ | ------- | ------------------------------------------------------------- |
| `commands-show-output` | MD014        | Yes     | No `$` before a shell command unless the output is shown too. |
| `blanks-around-fences` | MD031        | Yes     | Blank lines around fenced code blocks.                        |
| `no-space-in-code`     | MD038        | Yes     | No spaces inside inline code spans.                           |
| `fenced-code-language` | MD040        | No      | Every fenced code block names a language.                     |
| `code-block-style`     | MD046        | No      | One code block style (fenced or indented) across the file.    |
| `code-fence-style`     | MD048        | No      | One fence style (backticks or tildes) across the file.        |

### Links and images

| Rule                               | markdownlint | Fixable | Checks                                                      |
| ---------------------------------- | ------------ | ------- | ----------------------------------------------------------- |
| `no-reversed-links`                | MD011        | Yes     | Link syntax is not reversed, as in `(text)[url]`.           |
| `no-space-in-links`                | MD039        | Yes     | No spaces inside link text.                                 |
| `no-empty-links`                   | MD042        | No      | Every link has a destination.                               |
| `no-bare-urls`                     | MD034        | Yes     | URLs are wrapped in angle brackets or a link.               |
| `no-alt-text`                      | MD045        | No      | Every image has alt text.                                   |
| `link-fragments`                   | MD051        | Yes     | `#fragment` links point at a heading or anchor that exists. |
| `reference-links-images`           | MD052        | No      | Reference links and images use a label that is defined.     |
| `link-image-reference-definitions` | MD053        | Yes     | Every reference definition is used.                         |
| `link-image-style`                 | MD054        | Yes     | Only the allowed link and image styles are used.            |
| `descriptive-link-text`            | MD059        | No      | Link text is descriptive, not "click here" or "more".       |

### Emphasis and inline

| Rule                   | markdownlint | Fixable | Checks                                           |
| ---------------------- | ------------ | ------- | ------------------------------------------------ |
| `no-space-in-emphasis` | MD037        | Yes     | No spaces inside emphasis markers.               |
| `no-inline-html`       | MD033        | No      | No inline HTML.                                  |
| `proper-names`         | MD044        | Yes     | Listed names use the configured capitalization.  |
| `emphasis-style`       | MD049        | Yes     | One emphasis style (`*` or `_`) across the file. |
| `strong-style`         | MD050        | Yes     | One strong style (`**` or `__`) across the file. |

### Blockquotes and tables

| Rule                           | markdownlint | Fixable | Checks                                          |
| ------------------------------ | ------------ | ------- | ----------------------------------------------- |
| `no-multiple-space-blockquote` | MD027        | Yes     | One space after the `>` of a blockquote.        |
| `no-blanks-blockquote`         | MD028        | No      | No blank line inside a blockquote.              |
| `table-pipe-style`             | MD055        | No      | One table pipe style across the file.           |
| `table-column-count`           | MD056        | No      | Every table row has the same number of columns. |
| `blanks-around-tables`         | MD058        | Yes     | Blank lines around tables.                      |
| `table-column-style`           | MD060        | Yes     | Table columns follow one alignment style.       |

## Rules outside the presets

These rules have no markdownlint counterpart and no preset turns them on.
Add them to the `recheck` block by name.

| Rule                             | Fixable | Checks                                                                                                                        |
| -------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `front-matter`                   | No      | Front matter matches a JSON Schema. See [Front matter](#front-matter).                                                        |
| `list-length`                    | No      | A list has at least `min` items (default 2) and at most `max` items (no default). Nested lists count on their own.            |
| `no-empty-headings`              | No      | A heading has text content. Inline code counts as content.                                                                    |
| `no-duplicate-link-destinations` | No      | The same destination is not linked with different text in one file. Repeating the same text for the same destination is fine. |

The four Markdoc rules are documented with the [`recheck/markdoc` preset](./presets.md#recheckmarkdoc).

## Options

Options go under the assertion with the rule's name.
A rule not listed here has no options.
An option name a rule does not recognize is ignored without a warning.

### `blanks-around-fences`

| Option      | Type    | Default | Description                                               |
| ----------- | ------- | ------- | --------------------------------------------------------- |
| `listItems` | boolean | `true`  | Also require blank lines around fences inside list items. |

### `blanks-around-headings`

| Option               | Type    | Default | Description                                              |
| -------------------- | ------- | ------- | -------------------------------------------------------- |
| `linesAbove`         | number  | `1`     | Blank lines required above a heading.                    |
| `linesBelow`         | number  | `1`     | Blank lines required below a heading.                    |
| `includeFrontMatter` | boolean | `false` | Require a blank line between front matter and a heading. |

### `code-block-style`, `code-fence-style`, `emphasis-style`, `heading-style`, `hr-style`, `strong-style`, `table-pipe-style`, `ul-style`

| Option  | Type   | Default      | Description                                                                                                                                                                                            |
| ------- | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `style` | string | `consistent` | `consistent` uses the first style found in the file. The other values name one style, for example `fenced`, `backtick`, `asterisk`, `underscore`, `atx`, `dash`, `leading_and_trailing`, or `sublist`. |

The accepted names match markdownlint's options for the rule with the same id.

### `descriptive-link-text`

| Option            | Type     | Default                                  | Description                   |
| ----------------- | -------- | ---------------------------------------- | ----------------------------- |
| `prohibitedTexts` | [string] | `['click here', 'here', 'link', 'more']` | Link texts that are reported. |

### `fenced-code-language`

| Option             | Type     | Default | Description                                                |
| ------------------ | -------- | ------- | ---------------------------------------------------------- |
| `allowedLanguages` | [string] | `[]`    | When set, only these languages are allowed.                |
| `languageOnly`     | boolean  | `false` | Report an info string that carries more than the language. |

### `first-line-h1`, `single-h1`, `heading-increment`

| Option             | Type    | Default                | Description                                                                                             |
| ------------------ | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `frontMatterTitle` | string  | `^\s*"?title"?\s*[:=]` | A regex. Front matter that matches it counts as the top-level heading. Set `''` to ignore front matter. |
| `level`            | number  | `1`                    | `first-line-h1` and `single-h1` only: the heading level that counts as the title.                       |
| `allowPreamble`    | boolean | `false`                | `first-line-h1` only: allow content before the first heading.                                           |

### `line-length`

| Option                | Type    | Default | Description                                                         |
| --------------------- | ------- | ------- | ------------------------------------------------------------------- |
| `lineLength`          | number  | `80`    | Maximum line length.                                                |
| `headingLineLength`   | number  |         | Maximum length of heading lines. Falls back to `lineLength`.        |
| `codeBlockLineLength` | number  |         | Maximum length of lines in code blocks. Falls back to `lineLength`. |
| `codeBlocks`          | boolean | `true`  | Check code blocks.                                                  |
| `tables`              | boolean | `true`  | Check tables.                                                       |
| `headings`            | boolean | `true`  | Check headings.                                                     |
| `strict`              | boolean | `false` | Report long lines even when they hold no whitespace to break at.    |
| `stern`               | boolean | `false` | Report long lines that could be broken, allow the rest.             |

### `link-fragments`

| Option           | Type             | Default | Description                                                                                                                                                                                   |
| ---------------- | ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignoreCase`     | boolean          | `false` | Match fragments without regard to case.                                                                                                                                                       |
| `ignoredPattern` | string           | `''`    | A regex. Fragments that match it are not checked.                                                                                                                                             |
| `crossFile`      | boolean          | `false` | Also check links and images to other files. See [Cross-file links](#cross-file-links).                                                                                                        |
| `rootDir`        | string or object | `''`    | With `crossFile`, the folder that site-root links such as `/guides/intro` resolve against. An object maps a source folder prefix to its root for monorepos; the longest matching prefix wins. |
| `ignoredTargets` | [string]         | `[]`    | With `crossFile`, destination globs that are not checked, for routes a site generates from data.                                                                                              |

#### Cross-file links

With `crossFile: true`, the rule replaces an external link checker for links inside the repository:

- A relative link or image target must exist on disk.
- A `file.md#anchor` fragment must exist in the target file's headings and anchors.
- Extensionless links resolve the way the Realm router does: `./page` tries `page.md`, and a folder link reads its `index.md`.
- Site-root links such as `/x/y` resolve against `rootDir`, and are skipped without it.
- Links to `<details>` sections resolve, with the id derived from the `<summary>` text when none is set.
- Markdoc tags in a heading do not change its anchor.
- External URLs and `mailto:` links are skipped.

```yaml
recheck:
  rules:
    recheck/link-fragments:
      severity: error
      assertions:
        link-fragments:
          crossFile: true
          rootDir: docs
          ignoredTargets:
            - '/gateways/**'
```

### `link-image-reference-definitions`

| Option               | Type     | Default  | Description                             |
| -------------------- | -------- | -------- | --------------------------------------- |
| `ignoredDefinitions` | [string] | `['//']` | Definition labels that may stay unused. |

### `link-image-style`

| Option      | Type    | Default | Description                                         |
| ----------- | ------- | ------- | --------------------------------------------------- |
| `autolink`  | boolean | `true`  | Allow `<https://example.com>`.                      |
| `inline`    | boolean | `true`  | Allow `[text](url)`.                                |
| `full`      | boolean | `true`  | Allow `[text][label]`.                              |
| `collapsed` | boolean | `true`  | Allow `[label][]`.                                  |
| `shortcut`  | boolean | `true`  | Allow `[label]`.                                    |
| `urlInline` | boolean | `true`  | Allow `[https://example.com](https://example.com)`. |

### `list-length`

| Option | Type   | Default | Description                        |
| ------ | ------ | ------- | ---------------------------------- |
| `min`  | number | `2`     | Minimum number of items in a list. |
| `max`  | number |         | Maximum number of items in a list. |

### `list-marker-space`

| Option     | Type   | Default | Description                                            |
| ---------- | ------ | ------- | ------------------------------------------------------ |
| `ulSingle` | number | `1`     | Spaces after a bullet in a list of single-line items.  |
| `olSingle` | number | `1`     | Spaces after a number in a list of single-line items.  |
| `ulMulti`  | number | `1`     | Spaces after a bullet in a list with multi-line items. |
| `olMulti`  | number | `1`     | Spaces after a number in a list with multi-line items. |

### `no-duplicate-heading`

| Option                 | Type    | Default | Description                                                                                      |
| ---------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------ |
| `siblingsOnly`         | boolean | `false` | Report duplicates only among headings with the same parent.                                      |
| `respectSections`      | boolean | `false` | Report duplicates only inside the same section. A Recheck extension.                             |
| `caseSensitive`        | boolean | `true`  | Compare heading text with regard to case. A Recheck extension.                                   |
| `ignoreCommonHeadings` | boolean | `false` | Skip common headings such as "Overview", "Examples", and "Troubleshooting". A Recheck extension. |

### `no-emphasis-as-heading`, `no-trailing-punctuation`

| Option        | Type   | Default                                                                                                        | Description                               |
| ------------- | ------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `punctuation` | string | `.,;:!?。，；：！？` for `no-emphasis-as-heading`, the same without `?` and `？` for `no-trailing-punctuation` | The characters that count as punctuation. |

### `no-hard-tabs`

| Option                | Type     | Default | Description                                 |
| --------------------- | -------- | ------- | ------------------------------------------- |
| `codeBlocks`          | boolean  | `true`  | Check code blocks.                          |
| `ignoreCodeLanguages` | [string] | `[]`    | Code block languages that may contain tabs. |
| `spacesPerTab`        | number   | `1`     | Spaces that replace each tab with `--fix`.  |

### `no-inline-html`

| Option                 | Type     | Default | Description                                   |
| ---------------------- | -------- | ------- | --------------------------------------------- |
| `allowedElements`      | [string] | `[]`    | HTML elements that are allowed.               |
| `tableAllowedElements` | [string] | `[]`    | HTML elements that are allowed inside tables. |

### `no-multiple-blanks`

| Option    | Type   | Default | Description                      |
| --------- | ------ | ------- | -------------------------------- |
| `maximum` | number | `1`     | Consecutive blank lines allowed. |

### `no-multiple-space-blockquote`

| Option      | Type    | Default | Description                               |
| ----------- | ------- | ------- | ----------------------------------------- |
| `listItems` | boolean | `true`  | Also check list items inside blockquotes. |

### `no-trailing-spaces`

| Option               | Type    | Default | Description                                                      |
| -------------------- | ------- | ------- | ---------------------------------------------------------------- |
| `brSpaces`           | number  | `2`     | Trailing spaces that count as a hard line break and are allowed. |
| `codeBlocks`         | boolean | `false` | Check code blocks.                                               |
| `listItemEmptyLines` | boolean | `false` | Allow trailing spaces on empty lines inside list items.          |
| `strict`             | boolean | `false` | Report every trailing space, including hard line breaks.         |

### `ol-prefix`

| Option  | Type   | Default          | Description                                    |
| ------- | ------ | ---------------- | ---------------------------------------------- |
| `style` | string | `one_or_ordered` | `one`, `ordered`, `one_or_ordered`, or `zero`. |

### `proper-names`

| Option         | Type     | Default | Description                              |
| -------------- | -------- | ------- | ---------------------------------------- |
| `names`        | [string] | `[]`    | Names with their correct capitalization. |
| `codeBlocks`   | boolean  | `true`  | Check code blocks.                       |
| `htmlElements` | boolean  | `true`  | Check HTML elements.                     |

### `reference-links-images`

| Option           | Type     | Default | Description                                       |
| ---------------- | -------- | ------- | ------------------------------------------------- |
| `shortcutSyntax` | boolean  | `false` | Also check shortcut references such as `[label]`. |
| `ignoredLabels`  | [string] | `['x']` | Labels that are not checked.                      |

### `required-headings`

| Option      | Type     | Default | Description                                                                                              |
| ----------- | -------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `headings`  | [string] |         | The required headings in order. `*` matches zero or more headings, `+` one or more, and `?` zero or one. |
| `matchCase` | boolean  | `false` | Compare heading text with regard to case.                                                                |

### `table-column-style`

| Option             | Type    | Default | Description                                               |
| ------------------ | ------- | ------- | --------------------------------------------------------- |
| `style`            | string  | `any`   | `any`, `aligned`, `compact`, or `tight`.                  |
| `alignedDelimiter` | boolean | `false` | Require the delimiter row to be aligned with the columns. |

### `ul-indent`

| Option          | Type    | Default | Description                                                           |
| --------------- | ------- | ------- | --------------------------------------------------------------------- |
| `indent`        | number  | `2`     | Spaces per nesting level.                                             |
| `startIndented` | boolean | `false` | Allow the first level to be indented.                                 |
| `startIndent`   | number  | `2`     | Spaces of indentation for the first level when `startIndented` is on. |

## Front matter

The `front-matter` rule validates front matter against a JSON Schema with the same validator that Redocly CLI uses for API descriptions.
Map file globs to schemas.
The first mapping that matches a file wins, and a file that matches no mapping is not checked.

```yaml
recheck:
  rules:
    recheck/front-matter:
      severity: error
      assertions:
        front-matter:
          schemas:
            - files: ['.changeset/**']
              schema:
                type: object
                patternProperties:
                  '^@redocly/': { enum: [major, minor, patch] }
                additionalProperties: false
            - files: ['docs/**']
              schema: realm
              strict: true
```

Each mapping takes these keys:

| Key          | Type             | Description                                                                                           |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `files`      | [string]         | File globs the mapping applies to.                                                                    |
| `schema`     | object or string | An inline JSON Schema, or the name of a built-in schema. `realm` is the only built-in schema.         |
| `schemaFile` | string           | Path to a YAML or JSON schema file, relative to the working directory. Used when `schema` is not set. |
| `strict`     | boolean          | Report keys the schema does not define. Default `false`.                                              |

A file with no front matter validates as an empty object, so the schema's `required` list decides whether front matter is mandatory.
Each finding points at the line of the offending top-level key.
Front matter that is not valid YAML is one finding at the start of the block.

The built-in `realm` schema checks the type of every front matter option that a Realm page accepts, such as `title`, `description`, `slug`, `sidebar`, `excludeFromSearch`, and the options that override `redocly.yaml` on one page.
It does not check the inner shape of those option objects, because Realm evolves them independently.
`strict` is off by default, because pages often carry their own keys that Markdoc templates read back through `$frontmatter`.
