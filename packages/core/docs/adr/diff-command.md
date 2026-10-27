# How the `diff` command works

- Status: Accepted
- Date: 2026-10-27

## Context

`redocly diff` compares two versions of an API description, the base and the revision.
It finds what changed and decides how much each change can break clients: `major`, `minor`, or `patch`.
It supports OpenAPI 3.x and AsyncAPI 3.

The command must give the same answer for one API written in different ways:
split into files or not, with a `$ref` or with inline content, with keys in a different order.

## Decisions

### Compare typed trees, not text

The command builds a tree of typed nodes for each document with the walker, as lint does.
Each node knows its type (`Operation`, `Schema`, `Parameter`), its location, and its `$ref` target.

A text or JSON diff sees lines and keys.
It cannot tell a moved file from a changed schema, and it does not know that a removed `Operation` is different from a removed `description`.

### Two steps: find the changes, then judge them

```text
base ─┐                     ┌─ compareTrees ─> Change[] ─ judgeChanges ─> JudgedChange[]
      ├─ node trees ────────┤                                 ▲
rev ──┘                     └──────────────────────────── diff rules
```

`compareTrees` finds the changes and knows nothing about breaking.
A change is one node that was `added`, `removed`, or `modified`, with its path.
`judgeChanges` runs the diff rules on each change.

The split keeps the comparison the same for all specs and all rules.
A new rule does not touch the comparison.

### Pair children by key first, then by similarity

On each level, children of the two sides are paired:

1. The same child: the same key for a map entry or a field, the same content for a list item.
1. Else, the most alike child of the same type, if at least half of it is unchanged (Levenshtein distance).
   Git uses the same share to find a renamed file.

A renamed path or property becomes one `modified` change of its key, not a removed and an added node.
A field pairs only with the same field.

Known limit: the pairing is greedy, in document order.
When a node is removed and a similar node is added at the same time, the pair can be wrong.
Better pairing broke other cases, so we accepted this limit.

### Compare a shared node once

A `$ref` is compared by what it stands for, so a `$ref` and inline content can pair.
Each pair of base and revision nodes is compared once, at the first place that reaches it.
Other places that reach it are kept in `referencedBy`.

A change in a shared schema is one change, not one change for each operation that uses it.

### Get the direction from the place, when a rule asks

The same change can break a request and not a response.
For example, a new enum value is safe in a request and can break clients in a response.

A rule asks for the directions of a node.
The command climbs from the node through its parents and through every place that references it, and stops at the first node that tells the direction:
a request body, parameters, responses, `readOnly` or `writeOnly`, an AsyncAPI `action`.
Callbacks, webhooks, and replies turn the direction round.
A node can have both directions, or none.

The directions are computed once per change, and only when a rule asks.

### Diff rules are visitors over changes

A diff rule is a visitor keyed by node type, as a lint rule is, and nesting has the same meaning.
A diff rule gets a whole change, not a walk, so it has no `enter`, `leave`, or `skip`.

A rule reports a verdict with a message.
The configuration gives each rule its impact.
The impact of a change is the highest impact of its verdicts.
A change with no verdict is `minor` when something was added, and `patch` for all other changes.
A new component is `patch`: it changes nothing until a place uses it, and that place is a change of its own.

The rules are set for each spec (`oas3_1Diff`, `async3Diff`), and the `diff-recommended` preset turns them on.
When no rule is on, the command shows a warning.

### Compare what clients get

The command applies the decorators from the revision's configuration to both documents, as `bundle` does.
It does not apply preprocessors: they prepare a document for lint, not for publishing.

### Trust the revision, not the base

The base is a published version that the author cannot fix, so its problems are warnings.
An error in the revision, such as an unresolved `$ref`, fails the run, because the diff can miss breaking changes.

## Consequences

- Rules are short: they see one typed change and its directions, not the documents.
- Split files, `$ref`s, and key order do not create changes.
- A change in a shared component is reported once, at the component.
- The pairing can match the wrong nodes when a similar node is removed and another is added.
- Decorators and the revision's configuration change the result, so the same two files can give different results with different configurations.
