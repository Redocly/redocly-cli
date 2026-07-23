# Ban certain words from descriptions

Authors:

- [`@lornajane`](https://github.com/lornajane) Lorna Mitchell (Redocly)

## What this does and why

There are some words that just should not appear in `description` fields, but somehow they crop up time and time again. Eliminate them with this configurable rule that will error if they are used.

**Tip:** If there's a false positive, consider using the [ignore file](https://redocly.com/docs/cli/commands/lint/#generate-ignore-file) to skip that specific occurrence and keep the rule in place for everything else.

## Code

An example of `redocly.yaml` with a configurable rule:

```yaml
rules:
  rule/avoid-words-in-descriptions:
    subject:
      type: any
      property: description
    assertions:
      notPattern: /(simple|random|just)/i
```

Edit the `notPattern` section to add as many pipe-separated terms as you'd like to exclude.

## Examples

Acceptable description field:

```yaml
description: Retrieve all menu items in a collection.
```

Unacceptable description field (but choose your own banned words):

```yaml
description: Retrieve all menu items in a simple collection.
```
