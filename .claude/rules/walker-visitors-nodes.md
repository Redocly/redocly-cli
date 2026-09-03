# Walker, Visitors, and Nodes

The pattern behind every traversal of an API description in this repository.
In `packages/core`, linting, bundling, decorating, and preprocessing run through the walker.
In `packages/cli`, the commands that read a description (`stats`, `score`, `inspect-node-types`, `drift`) use it too.
Every rule, decorator, and preprocessor is a visitor.
Write new traversal as a visitor instead of parsing or drilling into documents by hand.

## Concepts

- **Node** — a typed object in the parsed API description.
  Its type name matches the spec concept: `Schema`, `Operation`, `Server`, `Parameter`, `Response`.
  The type trees, one per spec, are in `packages/core/src/types/`.
- **Visitor** — an object keyed by node type.
  Keys mirror node type names exactly.
  The visitor type maps are in `packages/core/src/visitors.ts`.
- **Walker** — `walkDocument` in `packages/core/src/walk.ts`.
  It traverses the parsed document, resolves each `$ref`, and calls the visitor hooks at every node.

There is no `Reference` node: a `$ref` and its target share the target's type.
The `ref` visitor key visits the references themselves.

When you write a rule or a decorator (or any visitor), run `redocly inspect-node-types <api>` to see the node type tree of the specification you work with.
The names it prints are the visitor keys, and `--type=<Type> --parents` shows where a type can sit.

## Hooks

A visitor key is a plain function (shorthand for `enter`) or an object with up to three hooks:

| Hook               | When it runs                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `enter(node, ctx)` | When the walker arrives at the node                                       |
| `leave(node, ctx)` | After all child nodes are visited; every `$ref` below is resolved by then |
| `skip(node, ctx)`  | Before `enter`; return `true` to skip this visitor for this node          |

## Context (`ctx`)

Every hook receives a `UserContext` (`packages/core/src/walk.ts`):

| Property           | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `report(problem)`  | Emit a problem                                       |
| `location`         | JSON pointer and source of the current node          |
| `location.child()` | Point at one field of the node                       |
| `key`              | Key of this node within its parent                   |
| `parent`           | Parent node                                          |
| `resolve(ref)`     | Resolve a `$ref` to its target node and location     |
| `rawNode`          | The unresolved node, when the `$ref` itself matters  |
| `type`             | Type descriptor of the current node                  |
| `specVersion`      | Spec version of the document, for example `'OAS3_1'` |
| `getVisitorData()` | Data store shared across one rule invocation         |

## Rules, decorators, and preprocessors

Each is a factory: it receives its options and returns a visitor.
The factory types live in `visitors.ts`, one set per spec flavor: `Oas3Rule`, `Oas3Decorator`, `Oas3Preprocessor`, and the same for `Oas2`, `Async2`, `Async3`, `Arazzo1`, and `Overlay1`.

State that spans nodes lives in the factory scope, so it is fresh for every document walk.
Collect in `enter` hooks and report in `leave`, often `Root.leave`, when every `$ref` is resolved.

When you author a rule, read the `redocly-lint-rules` skill first.
Its plugin section covers pitfalls that apply to built-in rules too: raw versus resolved children, the context fields, and how to prove a rule with a violating and a conforming fixture.

```ts
// packages/core/src/rules/oas3/no-server-trailing-slash.ts
import type { Oas3Rule } from '../../visitors.js';

export const NoServerTrailingSlash: Oas3Rule = () => {
  return {
    Server(server, { report, location }) {
      if (server.url?.endsWith('/') && server.url !== '/') {
        report({
          message: 'Server `url` should not have a trailing slash.',
          location: location.child(['url']),
        });
      }
    },
  };
};
```
