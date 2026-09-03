---
name: redocly-lint-rules
description: Implement a Redocly CLI lint rule from a description of what to check in an OpenAPI, AsyncAPI, or Arazzo document. Use when the user wants a convention enforced or a lint/validation rule for an API description, or migrates rules from another linter (such as Spectral) to Redocly.
---

# Implementing a Redocly CLI lint rule

Turn a check written in plain language ("every array schema must declare `items`") into a Redocly lint rule that works and is tested.

**The ladder.** Redocly gives three ways to do a check. The first is the cheapest to maintain.

1. **Built-in rule** — one of the [built-in rules](https://redocly.com/docs/cli/rules/built-in-rules) does the check.
2. **Configurable rule** — one or more `rule/*` entries in `redocly.yaml` do the check with assertions.
3. **Custom plugin** — a JavaScript visitor. Use this rung last.

Do the checks one at a time.
Start each check at rung 1.
Go down one rung only when the current rung cannot do the check.
Take all syntax from the [official docs](https://redocly.com/docs/cli/) or the [cookbook](https://github.com/Redocly/redocly-cli/tree/main/cookbook).
Trust the docs, not your memory.
Use modern syntax, such as ESM instead of CommonJS. If the project has its own style, follow the project.

## 1. Triage

For each check, write down three things: the node it looks at, what must be true, and what a violation looks like.
Triage each check on its own. Different checks can land on different rungs.

Get node names from the `node-type` command, not from memory.
The type tree is different in each specification and each version.
The names it prints are the `subject.type` of a configurable rule, and the visitor keys of a plugin.

| to learn                              | run                             |
| ------------------------------------- | ------------------------------- |
| the type at one location              | `--pointer='#/paths/~1orders'`  |
| every node, or every node of one type | no flag, or `--type=Schema`     |
| which types the description uses      | `--summary`                     |
| **where a type can sit**              | `--type=<Type> --parents`       |
| the ancestors of one node             | `--pointer=<pointer> --parents` |

The last two rows give a rule its scope.
When a type sits below more than one parent, the rule needs a `where` gate.
Without that gate, the rule also reports the branches you do not want.
The command shows the description in front of you. It does not show everything the specification permits.
When the command does not print a branch, that branch is unproven. It is not absent.
The command does not shorten step 3. It gives you type names. It does not tell you whether your assertions express the check.

Walk the ladder for each check:

- Search the [built-in rules list](https://redocly.com/docs/cli/rules/built-in-rules) for the concept.
  A trailing slash in a path gives `no-path-trailing-slash`.
  When the config already extends a ruleset that turns the built-in on, tell the user. Do not add the rule again.
  **Use the built-in when its description matches the check, even when it reports more than the rule you replace.**
  A built-in is usually a better version of the same idea, so its extra findings are the check done correctly.
  When you write the narrower behavior by hand, you exchange a maintained rule for code that you must maintain.
  Go down one rung only when the built-in checks something different.
  Report which built-in you took, and what it adds.
- Make sure the built-in supports the spec versions that the project lints.
  Some built-ins support one version only.
  `no-invalid-media-type-examples` supports OpenAPI 3.x, so it leaves a Swagger 2.0 check unenforced.
  Redocly prints `Unused rules found in redocly.yaml` when an enabled rule cannot apply to a document.
  Correct that line. It is not noise.
- Try assertions and a `where` gate. See "Configurable rules" below.
  One check can need several `rule/*` entries, one for each case or location. That is still better than a plugin.
- Write a plugin only when configurable rules cannot express the check, also in combination.
  First work through the three dials below.
  A plugin can do any check, but it is code. It adds complexity, maintenance, and its own bugs.
- Tell the user to [file an issue](https://github.com/Redocly/redocly-cli/issues) only when no configurable rule can close a real gap.

Triage is complete when each check has a rung.
Give one solution for each check: the highest rung that works.
Report only what the user must act on: a mismatch between a description and an implementation, an unproven rule, or a decision that could go another way.
Report in the chat. Never write a summary file.
The config records the rest, so do not narrate the rung of each check.

### Migrate from another linter

- Migrate the **effective** ruleset, not only the rules written in the file.
  An `extends`, or an inherited base, turns on more rules at their default severities. Each of those rules is also a check.
  Resolve that base and count the rules before you start. Then you know the true size of the job.
- Take each check from two places: the description of the rule, and its implementation.
  Never take it from your memory of the rule name.
  When the two disagree, use the description. The description says what the author wanted, and the implementation can hold a bug.
  Tell the user about the difference.
- Skip a rule with severity `off`. Do not migrate it, not even as a disabled entry.
  When the enabled rules are done, list each skipped rule on one line. Then the user can decide.
- For Spectral, read the map table in the [migration guide](https://redocly.com/docs/cli/guides/migrate-from-spectral) first.
  Many Spectral core rules map to one built-in. An empty cell means that you go down the ladder.
- When you copy a function from the source, you also copy its bugs into a stricter host.
  Redocly stops the whole document when a rule throws, but the source linter can stop one rule only.
  An unguarded match, such as `v.match(/…/)[0]` on a value that can fail to match, removes every finding in that file.
  Add a guard to the code you copy. Then lint a document that holds the difficult shape.

## 2. Configure

Write to the user's `redocly.yaml`. Use that exact name, with no leading dot.
When the file exists, read it first, and keep the existing `extends` and rules.
Set each rule to `error`, unless the user asks for another level.
When you migrate, keep the source severity and choose the nearest Redocly level.
Only `error`, which fails the run, `warn`, and `off` exist, so `info` and `hint` become `warn`.
Reference every file you create from the config, and exercise it in the lint run. Leave no dead files.

**A config with no `extends` inherits nothing** — not `recommended`, and not even `struct`.
The default base applies only when no config file exists.
So a `redocly.yaml` runs exactly the rules that it names.
The built-in rung exists only when `extends` names a ruleset, or when the config lists each built-in itself.
With neither, a document that breaks the specification three times lints clean.

**Wire every rule.**
A plugin in `plugins:` does nothing when its rules are absent from `rules:`, and Redocly gives no warning.
After you write the config, list the rule ids that must be active.
Confirm that each id is in `rules:` or in a spec-scoped block.

When all rules are in, compare your list with the predefined [rulesets](https://redocly.com/docs/cli/rules): `minimal`, `recommended`, `recommended-strict`, and `spec`.

- When your rules are close to one ruleset, extend it.
  Keep only the differences as overrides: other severities, rules to turn off, and checks that the ruleset does not hold.
- A ruleset also turns on rules that the user did not ask for.
  Read what it adds, and override each rule that contradicts or repeats a rule you wrote.
  A ruleset that turns on a check which the source sets to `off` is an error to correct, not a benefit.
- When the overrides are as many as the rules, or more, keep the plain list and no `extends`.

## 3. Verify

A rule is **unproven** until a live run makes it report.
Prove each rule with `npx redocly lint <api-file>` in two directions:

- a **violating** fixture: the rule reports, at the correct location;
- a **conforming** fixture: the run stays silent.

A false positive is the common failure, so a rule that passed only the violating fixture is unproven.
Write the violating fixture to separate this rule from the rule next to it: the rule you replace, or its neighbour in the config.
Two errors need that separation:

- **Put a falsy value in the violating fixture.**
  A rule that must reject an empty `description` must report on `description: ''`.
  When you put `''` in the conforming fixture only, you prove nothing, because a presence assertion accepts it.
  The rule then looks correct and the gap stays.
- **A built-in that replaces two source checks needs a fixture that breaks only the second check.**
  `no-unsafe-markdown` reports `<script>`, but never `eval(`.
  A fixture that holds both gives the built-in credit for a check it does not do.

To keep the output clean, pass a small temporary config with `--config`.
Delete that config and the fixtures when you finish.
Every snippet you deliver must be correct as written: it parses as YAML, and it behaves as you claim.

**You are done when each check names a violating fixture that reported, and a conforming fixture that stayed silent.**
Name those fixtures in your report.
A count is not evidence.
A clean run on the project's own files is not evidence either: it shows only that nothing reports there, and that is true for a correct rule and for a dead rule.
When you verify the risky rules and assume the others, the delivery is unproven. Say so, and name each unproven rule.
A conforming fixture proves only the shapes inside it.
A spec version you did not try, or a location that `--parents` showed and you did not exercise, stays untested. Report that.
When a live run is impossible, mark the rule unverified. Do not claim that it works.

You are also done when each requested check is in the config or on the skipped list, and the project holds only the config and plugin files that you created.

## Configurable rules

Docs: [configurable rules](https://redocly.com/docs/cli/rules/configurable-rules).
Worked examples: [cookbook/configurable-rules](https://github.com/Redocly/redocly-cli/tree/main/cookbook/configurable-rules).

A rule is an entry under `rules:` with a name that starts with `rule/`:

```yaml
rules:
  rule/my-check:
    subject:
      type: Schema # a node type from the docs' type list
      property: title # optional
    assertions:
      defined: true
    where: [] # optional gate
    message: Custom problem text.
    severity: error
```

Plain `rules` applies to every document that the project lints. Keep rules there by default.
Move a rule under a spec-scoped key only when the check needs something that exists in one spec version, such as `nullable` in OAS 3.0, or when the user asks for the scoping.
The keys are `oas2Rules`, `oas3_0Rules`, `oas3_1Rules`, `oas3_2Rules`, `async2Rules`, `async3Rules`, `arazzo1Rules`, and `overlay1Rules`.
A rule inside one key does not run for the other versions, so a check that the project needs on two versions needs an entry that both versions reach.
Scope a plugin rule inside the plugin instead, in its `rules` map.

### What an assertion tests

Two facts cause most false positives and most silent misses.

**An absent value passes.**
Nearly every assertion holds when the value it checks is absent.
`const: array` on `property: type` matches a schema typed `array`, and also every schema with no `type`.
So when a `where` entry tests a property value, add `defined: true` beside the value assertion if the property can be absent.

**Presence is not value.**
`defined`, `required`, `requireAny`, `disallowed`, and `mutuallyExclusive` test whether a key exists.
They say nothing about the content, so `defined: true` on `description` passes for `description: ''`.
Assert the value instead: `nonEmpty: true` rejects an empty string, and `const`, `enum`, and `pattern` test the content.
This is the most frequent defect in practice.
It looks correct in review, and only a violating fixture that holds `''` shows it.

Two results of these facts:

- `const: <value>` is also the way to say "this field must be falsy", because the assertion holds for that value and for an absent field.
- `requireAny` counts keys only.
  "At least one of these fields, and not empty" has no assertion form. That check is a real plugin case.

### What the assertion inspects

- `property: name` — the value of that field on the subject node.
- `property: [name, url, email]` — each listed field on its own.
  Every field that fails becomes its own problem with its own JSON pointer, such as `#/info/contact/name`.
- `property` absent — the **keys** of the subject node.
  For example, `subject: { type: Paths }` with `assertions: { notPattern: /.+\/$/ }` runs on the path strings themselves.

### Aim the subject, then gate it

Three dials aim a rule. Resolve them in this order.

**1. Subject: the node that owns what you assert.**

- A check about the **keys that a map holds** targets the map type itself.
  The maps of responses, headers, schema properties, and paths are each their own type.
  So "this map must hold that key" is one `required` on one subject. Do not search the parent.
- A check about a **value** targets the node that holds the field, plus `property`.
- `type: any` with a `property` checks that property everywhere it appears.
- Confirm the type name with `node-type`, on a document of the spec version that the rule targets.
  A named type can exist in one version and not in another.
  `HeadersMap` is a type in OpenAPI 3. In OpenAPI 2 the response `headers` map is anonymous and has no type name, so a `HeadersMap` subject under `oas2Rules` never reports.
  Redocly warns about an unresolved rule id, but **not** about an unresolved `subject.type`, so a wrong type gives you a rule that never reports and never complains.

**2. Parent-key filters: `filterInParentKeys`, `filterOutParentKeys`, `matchParentKeys`.**

These filters match the **key of the subject node inside its parent**.
So they work only where that key varies: a method inside a path item, a status code inside a responses map, a path string inside a paths map.
`matchParentKeys` takes a regular expression, so it reaches a class of keys, and a negative lookbehind inside it excludes a shape.

The common error is a filter one level too high.
The key of a `Responses` node is always `responses`, so `filterInParentKeys: [put]` on a `Responses` subject matches nothing and the rule never reports.
The method varies one level above. Reach it with `where`:

```yaml
rule/put-responses-must-include-200:
  subject:
    type: Responses # the key here is always `responses`, so no filter belongs on it
  assertions:
    required: ['200']
  where:
    - subject:
        type: Operation
        filterInParentKeys: [put] # the key that varies
      assertions:
        defined: true
```

**3. `where`: the ancestor gate.**

Build the gate from `--type=<Type> --parents`.
Each chain in that output is a place where the subject sits, and the gate keeps the chain you want.
Each entry names a type that must sit above the subject, and the rule skips every node that is not inside a matching ancestor.
The assertions of a gate entry are filters, never checks: when one fails, the node drops out in silence instead of becoming a problem.
The mechanics are exact:

- Entries run in document order, outermost first. Each type can appear in one entry only.
- The chain **can skip levels**. Name the ancestors that matter, not every node between them.
- The subject's own type **can also appear in the last entry**.
  That is how the gate carries a parent-key filter or an exclusion while the subject stays whole.
- An entry of the subject's own type narrows the subject by one of its properties, such as "this schema, when its `type` is `array`".
- One entry can carry both a parent-key filter and assertions, so it says "inside an ancestor with this key **and** this value".
- References resolve at the gate, so entries see resolved nodes.
- For a Schema subject with a `where`, evaluation stops at the first schema level that matches the gate.
- A gate cannot exclude a nested `callbacks` branch.
  An operation inside a callback still reaches a rule gated on `Paths`.
  Say so. Do not claim that the gate excludes it.

When one subject becomes hard to aim, write one rule for each case.
Several small `rule/*` entries stay readable, and they are still better than a plugin.

### Recipes

A check that looks like plugin work usually needs one of these. Try them before you choose a plugin.

**Gate a check about paths with the paths map.**
The type that holds a path also holds webhook names and callback keys, so a rule about the shape of a URL also reports those unless the gate names the paths map:

```yaml
rule/put-path-ends-with-parameter:
  subject:
    type: Operation
    filterInParentKeys: [put]
  assertions:
    defined: false
  where:
    - subject:
        type: Paths # without this entry the rule also reports webhooks and callbacks
      assertions:
        defined: true
    - subject:
        type: PathItem
        matchParentKeys: /[^}]$/
      assertions:
        defined: true
```

Run `--type=<Type> --parents` on the type you want to target.
Every chain it prints is a place where the rule reports, and each chain you do not want needs a gate entry.

**Require a value, not only a key.**
`additionalProperties` must not sit beside `properties`, but `additionalProperties: false` stays permitted:

```yaml
rule/no-additional-properties-with-properties:
  subject:
    type: Schema
    property: additionalProperties
  assertions:
    const: false
  where:
    - subject:
        type: Schema
        property: properties
      assertions:
        defined: true
```

**Guard a value gate against an absent value.**
The `defined: true` keeps this rule off a schema that declares no `type`:

```yaml
rule/array-items:
  subject:
    type: Schema
  assertions:
    required: [items]
  where:
    - subject:
        type: Schema
        property: type
      assertions:
        const: array
        defined: true
  message: The 'items' field is required for schemas of array type.
```

A value assertion cannot match a list, so this gate misses the OpenAPI 3.1 union form `type: [array, 'null']`.
Cover that version with a second entry, or report that the rule is narrower than the source.

**Locate by ancestor, and skip the levels between.**
"The media types of the 200 and 400 responses of one path" needs two gate entries, and no entry for the operation or the responses map:

```yaml
rule/health-media-type:
  subject:
    type: MediaTypesMap # keys, so `const` checks the media type itself
  assertions:
    const: application/health+json
  where:
    - subject:
        type: PathItem
        matchParentKeys: '/health'
      assertions:
        defined: true # a pure gate: this ancestor must exist
    - subject:
        type: Response
        filterInParentKeys: ['200', '400']
      assertions:
        defined: true
```

**Filter the subject from the gate, and exclude with it.**

```yaml
rule/post-should-define-requestBody:
  subject:
    type: Operation
  assertions:
    required: [requestBody]
  where:
    - subject:
        type: PathItem
        matchParentKeys: /^([\w-\{\}/.](?<!/actions))*$/ # the lookbehind excludes a URI shape
      assertions:
        defined: true
    - subject:
        type: Operation # the subject's own type, in the last entry
        filterInParentKeys: [post]
      assertions:
        disallowed: [deprecated] # a filter, so a deprecated operation drops out
```

**Gate on the value of an ancestor**, to say "only inside a node that looks like this":

```yaml
where:
  - subject:
      type: Operation
      property: deprecated
    assertions:
      defined: true
      const: true
```

**Combine assertions in one rule.** All of them must hold:

```yaml
assertions:
  requireAny: [minLength, maxLength, enum]
  mutuallyRequired: [minLength, maxLength]
```

**Match without case.** `pattern` and `notPattern` accept inline regular expression flags, so a header-name check needs no plugin:

```yaml
assertions:
  notPattern: '/^(authorization|content-type|accept)$/i'
```

**Assert on the reference, not on the resolved value.**
`ref: true` requires a `$ref`, `ref: false` requires an inline value, and a string requires the unresolved `$ref` to match:

```yaml
subject:
  type: MediaType
  property: schema
assertions:
  ref: /^#\/components\/.*/
```

**Bound a list.** `minLength` and `maxLength` apply to lists and to strings, so a list type as the subject limits how many members it holds. Use `maxLength: 1` for a single server.

**Forbid a node type.** A subject with `defined: false` and no `property` rejects a construct anywhere in the description.

**Record an exception.** When the rule is correct and a few nodes are real exceptions, keep the pattern strict and record those nodes in `.redocly.lint-ignore.yaml`.

**YAML gotcha.** Quote a `message` that holds a colon followed by a space, or the config fails to parse:

```yaml
message: 'Schemas with type: array must define items.'
```

## Custom plugin rules

Docs: [custom rules](https://redocly.com/docs/cli/custom-plugins/custom-rules).
Worked examples: [cookbook/custom-plugin-rules](https://github.com/Redocly/redocly-cli/tree/main/cookbook/custom-plugin-rules).
The full visitor guide is at https://raw.githubusercontent.com/Redocly/redocly-cli/refs/heads/main/.claude/skills/rules-system/SKILL.md.

A plugin is a module. Its default export is a **function** that returns the plugin object:

```js
export default function myPlugin() {
  return {
    id: 'my-plugin',
    rules: {
      oas3: {
        'schema-title-defined': SchemaTitleDefined,
      },
    },
  };
}
```

Rules are keyed by spec flavor: `oas2`, `oas3`, `async2`, `async3`, and `arazzo`.
Register the same rule under several flavors when the check applies to all of them.

### Register and use

```yaml
# redocly.yaml
plugins:
  - ./my-plugin.js
rules:
  my-plugin/schema-title-defined: error
```

The config name of the rule is `<plugin id>/<rule name>`.
**Both halves are required.**
A plugin under `plugins:` runs nothing when its rules are absent from `rules:`, and Redocly gives no warning.
The rules are then delivered and dead.

### The visitor pattern

A rule is a factory that returns a visitor object keyed by node type.
The walker traverses the document, resolves each `$ref`, and calls your hooks.
Never parse the document yourself, and never walk into it by hand.

Confirm each visitor key with the `node-type` command.
A key that is wrong or invented is never called, and nothing reports the mistake.
There is no `Reference` node, because a `$ref` and its target share the type of the target.
Watch the singular and the plural: the map of component schemas is `NamedSchemas`, and `NamedSchema` matches nothing.

Keep the rule small. Express everything through the visitors that the walker gives you.
A plugin rule needs no traversal helper, no second walker, and no resolver of its own.
The walker already reaches every node of a type, and it resolves each `$ref` before `leave`.
Use another visitor key before you write a helper.

```js
function SchemaTitleDefined() {
  return {
    Schema: {
      enter(schema, ctx) {
        if (schema.type === 'object' && !schema.title) {
          ctx.report({
            message: 'Object schemas must define a title.',
            location: ctx.location.child(['type']),
          });
        }
      },
    },
  };
}
```

- The hooks are `enter(node, ctx)`, `leave(node, ctx)`, and `skip(node, ctx)`.
  `leave` runs after the children, when every `$ref` is resolved.
  Write the hooks as an explicit object with `enter` and `leave` keys, as in the example.
- Keep state that crosses nodes in the factory scope.
  Collect in the `enter` hooks, and report in `Root.leave`.

### The context object

Use only these fields. The context is not the document, and it holds no path and no root.

| use                                 | for                                                            |
| ----------------------------------- | -------------------------------------------------------------- |
| `ctx.report({ message, location })` | report the problem                                             |
| `ctx.location.child([...])`         | point at one field                                             |
| `ctx.location.key()`                | point at the key of the node — a report location, not a string |
| `ctx.key`                           | the key of the node itself, as a value                         |
| `ctx.parent`                        | the parent node                                                |
| `ctx.resolve(ref)`                  | resolve a `$ref` to its target                                 |
| `ctx.rawNode`                       | the unresolved node, when you need the `$ref` itself           |
| `ctx.specVersion`                   | the spec version of the document                               |

There is no `ctx.document`, no `ctx.root`, and no `ctx.path`.
A rule that reads one of them throws.

**A rule that throws stops the whole document.**
Every finding from every rule is lost for that file, not only the findings of your rule.
So an invented context field costs much more than a rule that never reports.

`ctx.key` is the reason a method or a status code belongs on the node whose key varies.
Inside a `Responses` visitor, `ctx.key` is always `responses`, so `if (ctx.key !== 'delete') return` never passes.
That is the same error as a parent-key filter one level too high.

### Read resolved nodes, not raw children

Inside `enter`, a child that is a `$ref` is still a reference.
So `response.schema`, or the `name` of a parameter, is `undefined` for every member that is a `$ref`.
That turns into a false positive on an ordinary document: a uniqueness check reports "duplicate name: undefined", and a required-field check reports a field that is present behind the reference.

Use one of these instead:

- report in `leave`, where every `$ref` below the node is resolved;
- visit the type of the child, so the walker gives you the resolved node;
- call `ctx.resolve(ref)`.

Prove the rule with a fixture whose members are `$ref`s.
A fixture with everything inline does not test this.
