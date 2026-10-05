---
seo:
  title: Recheck prose rules
  description: Write your own prose and style rules for the recheck command with scopes and assertions.
---

# Prose rules

A prose rule checks the words of a document rather than its Markdown syntax.
You write one in the `recheck` block from three parts: a **scope** that selects the text, an **assertion** that checks it, and a **message** that explains the finding.

```yaml
recheck:
  rules:
    recheck/no-gerund-headings:
      severity: warn
      scope: heading
      message: 'Do not start a heading with a gerund.'
      link: https://example.com/style-guide#headings
      assertions:
        pattern:
          ignoreCase: true
          tokens:
            - '^\w+ing\b'
```

This page lists every scope and every assertion with its options.
The [`recheck` configuration reference](../configuration/reference/recheck.md) lists the other keys of a rule, such as `appliesTo`, `excludes`, and `exceptions`.

## Rule keys and messages

A rule key is `<namespace>/<name>`, in lowercase, for example `recheck/us-spelling` or `acme/product-names`.
The presets use their own namespaces, such as `google/`, so your keys never collide with theirs.
The report prints the key without the `recheck/` prefix.

A prose rule needs a `message`.
The message can hold `%s` placeholders, which the assertion fills in order.
Each assertion lists what it fills.
Most assertions fill two values; `length` fills three and `metric` fills four.
A message with more placeholders than the assertion fills is a configuration error.

## Scopes

The `scope` key selects which parts of a file the rule reads.
The default is `all`.

| Scope          | Selects                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `all`          | The whole file as one segment.                                                                          |
| `raw`          | The raw file content, without scope segmentation.                                                       |
| `summary`      | The document's prose: paragraph, heading, list item, blockquote, and table cell text. Alias: `default`. |
| `sentence`     | Each sentence of the prose.                                                                             |
| `paragraph`    | Each paragraph.                                                                                         |
| `heading`      | Each heading. `heading.h1` to `heading.h6` select one level.                                            |
| `list-item`    | The text of each list item.                                                                             |
| `blockquote`   | The text of each blockquote.                                                                            |
| `table.header` | Each table header cell.                                                                                 |
| `table.cell`   | Each table body cell.                                                                                   |
| `code`         | Each code block.                                                                                        |
| `frontmatter`  | The YAML front matter.                                                                                  |
| `html`         | Each raw HTML block.                                                                                    |
| `comment`      | Each HTML comment.                                                                                      |
| `alt`          | The alt text of each image.                                                                             |
| `link`         | The text of each link.                                                                                  |
| `markdoc.tag`  | Each Markdoc tag span. Needs [`markdoc: true`](./markdoc.md).                                           |

A list of scopes selects all of them:

```yaml
scope:
  - heading.h1
  - heading.h2
```

A selector narrows a scope: `~` excludes a scope, and `&` joins conditions.
For example, `'~blockquote & ~heading'` selects everything except blockquotes and headings.
`all` and `raw` cover the whole file, so they cannot be combined with another scope.

Prose scopes never include inline code, and when [Markdoc parsing](./markdoc.md) is on, they do not include the tag syntax either.
Set `includeCode: true` on `swap`, `pattern`, `repetition`, or `consistency` to match inside inline code.

## Assertions

Each rule has one or more assertions under `assertions`, keyed by assertion id.
The [Markdown rules](./rules.md) are also assertions, keyed by rule name, and a rule can combine both kinds.

| Assertion              | Checks                                                    | Fixable |
| ---------------------- | --------------------------------------------------------- | ------- |
| `swap`                 | A word or phrase that should be replaced.                 | Yes     |
| `pattern`              | A regex that should not match.                            | No      |
| `occurrence`           | How many times a regex matches in a segment.              | No      |
| `repetition`           | An adjacent repeated word.                                | Yes     |
| `consistency`          | One spelling of a pair across the file.                   | Yes     |
| `conditional`          | A pattern that requires another pattern in the same file. | No      |
| `capitalization`       | Title case, sentence case, or a custom pattern.           | Yes     |
| `length`               | The size of a segment in characters, words, or sentences. | No      |
| `metric`               | A readability score for the whole document.               | No      |
| `spelling`             | Words the dictionary does not know.                       | No      |
| `semantic-line-breaks` | One sentence or phrase per line.                          | Yes     |
| `max-image-size`       | The file size of linked images.                           | No      |

### `swap`

Reports a word or phrase and suggests a replacement.
With `--fix`, each match is replaced, and the match's own casing is applied to the replacement: a capitalized match gets a capitalized replacement, and an all-caps match gets an all-caps replacement.
When two pairs match overlapping text, the longest match wins.

```yaml
assertions:
  swap:
    ignoreCase: true
    wordBoundary: true
    pairs:
      utilize: use
      in order to: to
```

| Option         | Type    | Required | Description                                                                                             |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `pairs`        | object  | Yes      | Text to find mapped to its replacement.                                                                 |
| `ignoreCase`   | boolean | No       | Match without regard to case. Default `false`.                                                          |
| `wordBoundary` | boolean | No       | Match whole words only. Default `false`.                                                                |
| `keysAreRegex` | boolean | No       | Treat each key as a regex, for example `favou?rite`. An invalid regex matches nothing. Default `false`. |
| `includeCode`  | boolean | No       | Also match inside inline code spans. Default `false`.                                                   |

Message placeholders: the replacement, then the matched text.
With the pair `utilize: use`, the message `'Use "%s" instead of "%s".'` prints `Use "use" instead of "utilize".`

### `pattern`

Reports each match of a regex.

```yaml
assertions:
  pattern:
    ignoreCase: true
    tokens:
      - '\bvery\b'
      - '\breally\b'
```

| Option        | Type     | Required | Description                                                    |
| ------------- | -------- | -------- | -------------------------------------------------------------- |
| `tokens`      | [string] | Yes      | Regex patterns. An invalid pattern matches nothing.            |
| `ignoreCase`  | boolean  | No       | Match without regard to case. Default `false`.                 |
| `nonword`     | boolean  | No       | Do not add word boundaries around each token. Default `false`. |
| `includeCode` | boolean  | No       | Also match inside inline code spans. Default `false`.          |

Message placeholders: the matched text.

### `occurrence`

Counts the matches of a regex in each segment and reports the segment when the count is outside `min` and `max`.
`min: 1` without `max` requires the pattern to be present.

```yaml
scope: paragraph
assertions:
  occurrence:
    pattern: '[.!?]'
    max: 3
```

| Option       | Type    | Required              | Description                                    |
| ------------ | ------- | --------------------- | ---------------------------------------------- |
| `pattern`    | string  | Yes                   | The regex to count.                            |
| `min`        | number  | One of `min` or `max` | Fewer matches is a finding.                    |
| `max`        | number  | One of `min` or `max` | More matches is a finding.                     |
| `ignoreCase` | boolean | No                    | Match without regard to case. Default `false`. |

Message placeholders: the match count, then the bound that was crossed.

### `repetition`

Reports an adjacent repeated word, such as "the the", including across a line break.
With `--fix`, the pair collapses to the first word.

```yaml
assertions:
  repetition: {}
```

| Option        | Type    | Required | Description                                                                           |
| ------------- | ------- | -------- | ------------------------------------------------------------------------------------- |
| `pattern`     | string  | No       | The regex that defines a word. Default `\w+`.                                         |
| `ignoreCase`  | boolean | No       | Compare without regard to case. Default `true`, because "The the" is the common typo. |
| `includeCode` | boolean | No       | Also look for repeats inside inline code spans. Default `false`.                      |

Message placeholders: the repeated word.

### `consistency`

Each entry of `either` names two variants.
The variant that appears first in a file wins, and later uses of the other variant are reported.
With `--fix`, they are replaced with the winning variant as written in `either`.

```yaml
assertions:
  consistency:
    ignoreCase: true
    either:
      behavior: behaviour
      color: colour
```

| Option        | Type    | Required | Description                                           |
| ------------- | ------- | -------- | ----------------------------------------------------- |
| `either`      | object  | Yes      | Pairs of variants. Each pair has its own winner.      |
| `ignoreCase`  | boolean | No       | Match without regard to case. Default `false`.        |
| `includeCode` | boolean | No       | Also match inside inline code spans. Default `false`. |

Message placeholders: the later variant, then the variant that appeared first.

### `conditional`

If `first` matches in the rule's scope, `second` must match somewhere in the whole file, code blocks included.
Otherwise each `first` match is reported.

```yaml
assertions:
  conditional:
    first: '\bTBD\b'
    second: 'https://github\.com/\S+/issues/\d+'
```

| Option       | Type    | Required | Description                                    |
| ------------ | ------- | -------- | ---------------------------------------------- |
| `first`      | string  | Yes      | The regex that requires `second`.              |
| `second`     | string  | Yes      | The regex that must appear in the file.        |
| `ignoreCase` | boolean | No       | Match without regard to case. Default `false`. |

Message placeholders: the `first` match, then the `second` pattern.

### `capitalization`

Reports a segment whose casing does not match the required style.

```yaml
scope: heading
assertions:
  capitalization:
    match: $sentence
    exceptions: [Redocly, Reunite]
```

| Option              | Type     | Required | Description                                                                                                                |
| ------------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `match`             | string   | Yes      | `$title`, `$sentence`, `$lower`, `$upper`, or a regex the whole segment must match.                                        |
| `style`             | string   | No       | The stopword list for `$title`: `ap` or `chicago`. Default `ap`.                                                           |
| `exceptions`        | [string] | No       | Words and phrases that keep their casing as written, such as `GitHub` or `VS Code`.                                        |
| `builtinVocabulary` | boolean  | No       | Add the built-in list of technical proper nouns, such as `OpenAPI`, `npm`, and `Node.js`, to `exceptions`. Default `true`. |

- `$title` capitalizes every word except articles, conjunctions, and prepositions.
  `ap` lowercases prepositions of three letters or fewer; `chicago` lowercases every preposition.
  The first and last words are always capitalized.
- `$sentence` capitalizes the first word and lowercases the rest, except exceptions and words in all caps.
- `$lower` and `$upper` require the whole segment in that case.
- A regex must match the whole segment.
  This mode is detection-only.

Words in all caps, such as `API`, and inline code are never changed.
`--fix` rewrites a single-line segment for the four `$` styles.
A segment that spans several lines is skipped.

Message placeholders: the segment text, then the `match` value.

### `length`

Measures each segment in the rule's scope and reports it when the size is outside `min` and `max`.

```yaml
scope: sentence
assertions:
  length:
    unit: words
    max: 25
```

| Option | Type   | Required              | Description                            |
| ------ | ------ | --------------------- | -------------------------------------- |
| `unit` | string | Yes                   | `characters`, `words`, or `sentences`. |
| `min`  | number | One of `min` or `max` | A smaller segment is a finding.        |
| `max`  | number | One of `min` or `max` | A larger segment is a finding.         |

Message placeholders: the measured size, the unit, then the bound that was crossed.

### `metric`

Scores the prose of the whole document with a readability formula and reports the file once, at line 1, when the score is outside `min` and `max`.
The score reads the same prose as `redocly recheck --readability`: headings, code, front matter, and Markdoc tags do not count.
A file with no prose is never reported.

```yaml
assertions:
  metric:
    formula: flesch-reading-ease
    min: 30
```

| Option    | Type   | Required              | Description                                                                                                       |
| --------- | ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `formula` | string | Yes                   | `flesch-reading-ease`, `flesch-kincaid-grade`, `gunning-fog`, `smog`, `coleman-liau`, or `automated-readability`. |
| `min`     | number | One of `min` or `max` | A lower score is a finding.                                                                                       |
| `max`     | number | One of `min` or `max` | A higher score is a finding.                                                                                      |

The assertion always reads the `summary` scope.
Setting another scope prints a warning and has no effect.

Message placeholders: the formula, the score, `min`, then `max`.

### `spelling`

Reports words that a Hunspell dictionary does not recognize, with up to three suggestions.
The English dictionary ships with Redocly CLI.

```yaml
scope: summary
assertions:
  spelling:
    vocab: [Redocly, Reunite]
    ignore: ['\bAcme\w*']
```

| Option              | Type     | Required | Description                                                                                                             |
| ------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dictionary`        | string   | No       | Base path of a custom Hunspell dictionary, without the `.aff` and `.dic` extensions, relative to the working directory. |
| `vocab`             | [string] | No       | Words that are never reported, matched without regard to case.                                                          |
| `ignore`            | [string] | No       | Regex patterns. A word that matches any of them is never reported.                                                      |
| `builtinVocabulary` | boolean  | No       | Also accept the built-in list of technical proper nouns. Default `true`.                                                |

Words in all caps and words next to a digit, such as `utf8`, are not checked.
Inline code is never checked.

Message placeholders: the unknown word, then a suggestion suffix in the form `— did you mean: world?`, or an empty string when there is no suggestion.

### `semantic-line-breaks`

Requires one sentence, or one phrase, per line.
With `--fix`, long lines are split after each sentence, and list item continuation lines are indented under the item text.

```yaml
assertions:
  semantic-line-breaks:
    mode: sentence
```

| Option             | Type    | Required | Description                                                             |
| ------------------ | ------- | -------- | ----------------------------------------------------------------------- |
| `mode`             | string  | Yes      | `sentence` breaks after each sentence; `phrase` also breaks at clauses. |
| `maxPhrase`        | number  | No       | In `phrase` mode, the longest phrase that may stay on one line.         |
| `ignoreCodeBlocks` | boolean | No       | Skip code blocks.                                                       |
| `ignoreTables`     | boolean | No       | Skip tables.                                                            |

### `max-image-size`

Reports an image whose file is larger than the limit.
The image path is resolved from the Markdown file and must stay inside the folder passed to the command.

```yaml
assertions:
  max-image-size:
    maxSizeKB: 200
```

| Option       | Type     | Required | Description                                                                       |
| ------------ | -------- | -------- | --------------------------------------------------------------------------------- |
| `maxSizeKB`  | number   | No       | The limit in kilobytes. Default `100`.                                            |
| `extensions` | [string] | No       | File extensions to check. Default `jpg`, `jpeg`, `png`, `gif`, `webp`, and `svg`. |

## Built-in proper nouns

The `capitalization` and `spelling` assertions share a list of technical proper nouns, such as `OpenAPI`, `GraphQL`, `npm`, `Node.js`, `VS Code`, and `Kubernetes`.
It saves every project from listing the same names.
`capitalization` keeps them cased as written, and `spelling` accepts them as words.
Set `builtinVocabulary: false` on a rule to use only its own `exceptions` or `vocab`.

The list leaves out words that are also ordinary English, such as `Chrome` or `Windows`, because an exception for them would weaken the check.
Add names like that in the rule's own `exceptions` or `vocab`.
The list is exported as `TECHNICAL_PROPER_NOUNS` from the `@redocly/recheck` package.

## Examples

### US spelling

```yaml
recheck:
  rules:
    recheck/us-spelling:
      severity: error
      scope: summary
      message: 'Use the US spelling "%s" instead of "%s".'
      assertions:
        swap:
          ignoreCase: true
          wordBoundary: true
          pairs:
            colour: color
            behaviour: behavior
            organise: organize
```

### Sentence length with an exception for a frozen page

```yaml
recheck:
  rules:
    acme/sentence-length:
      severity: warn
      scope: sentence
      message: 'Sentence is %s %s long; keep it under %s.'
      assertions:
        length:
          unit: words
          max: 25
      exceptions:
        files:
          - docs/legal/**
```

### Readability floor for guides only

```yaml
recheck:
  rules:
    acme/readability-floor:
      severity: warn
      message: 'Readability (%s) is %s; expected between %s and %s.'
      appliesTo:
        - docs/guides/**
      assertions:
        metric:
          formula: flesch-reading-ease
          min: 40
```
