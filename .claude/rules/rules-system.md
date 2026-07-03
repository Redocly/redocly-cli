## Rules System: Walker, Visitors, and Nodes

This is the most important pattern to understand when working in `packages/core`.

### Concepts

**Node** — a typed object in the parsed API description AST. Every node has a name that matches its spec concept: `Schema`, `Operation`, `Server`, `Parameter`, `Response`, etc. The full list of node types per spec is in `packages/core/src/types/`.

**Visitor** — an object whose keys are node names. When the Walker enters or leaves a node of that type, it calls the corresponding visitor hook. Visitor names mirror node names exactly. The full visitor type map is in `packages/core/src/visitors.ts`.

**Walker** — the engine in `packages/core/src/walk.ts` (`walkDocument`). It recursively traverses the parsed document, resolves `$ref` references, and invokes registered visitors at each node.

### Visitor hooks

Each key in a visitor object can be either a plain function (shorthand for `enter`) or an object with up to three hooks:

| Hook               | When it runs                                                                     |
| ------------------ | -------------------------------------------------------------------------------- |
| `enter(node, ctx)` | When the Walker first arrives at this node                                       |
| `leave(node, ctx)` | After all child nodes have been visited; all `$ref`s are resolved by this point  |
| `skip(node, ctx)`  | Called before `enter`; return `true` to skip this visitor entirely for this node |

### Context object (`ctx`)

Every visitor hook receives a context object with:

| Property           | Type                 | Description                                             |
| ------------------ | -------------------- | ------------------------------------------------------- |
| `report(problem)`  | function             | Emit a lint problem                                     |
| `location`         | `Location`           | JSON pointer + source of the current node               |
| `key`              | `string \| number`   | Key of this node within its parent                      |
| `parent`           | `any`                | Parent node object                                      |
| `resolve(ref)`     | function             | Resolve a `$ref` to its target node and location        |
| `type`             | `NormalizedNodeType` | Type descriptor for the current node                    |
| `specVersion`      | `SpecVersion`        | E.g., `'OAS3_0'`, `'OAS3_1'`                            |
| `getVisitorData()` | function             | Shared data store scoped to the current rule invocation |

### Rule function signature

A rule is a factory function that receives rule options and returns a visitor object. The type depends on the target spec:

```ts
import type { Oas3Rule } from '../../visitors.js';

// Factory receives rule options, returns a visitor
export const MyRule: Oas3Rule = (options) => {
  // State can be kept here — it is scoped to one document walk
  return {
    NodeName(node, ctx) {
      /* shorthand enter */
    },

    OtherNode: {
      enter(node, ctx) {
        /* ... */
      },
      leave(node, ctx) {
        /* ... */
      },
      skip(node, ctx) {
        return false;
      },
    },
  };
};
```

Available rule types: `Oas3Rule`, `Oas3_1Rule`, `Oas2Rule`, `Async2Rule`, `Async3Rule`, `ArazzoRule`.

### Minimal rule example

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

### Stateful rule example (using `enter` + `leave`)

```ts
// packages/core/src/rules/oas3/no-unused-components.ts
import type { Oas3Rule } from '../../visitors.js';

export const NoUnusedComponents: Oas3Rule = () => {
  const components = new Map<string, { used: boolean; location: Location; name: string }>();

  return {
    // Track every $ref resolution — mark the target as used
    ref(ref, { type, resolve, key, location }) {
      const resolved = resolve(ref);
      if (resolved.location) {
        components.set(resolved.location.absolutePointer, {
          used: true,
          name: key.toString(),
          location,
        });
      }
    },

    // Report unused components only after the entire document has been walked
    Root: {
      leave(_, { report }) {
        components.forEach((info) => {
          if (!info.used) {
            report({
              message: `Component: "${info.name}" is never used.`,
              location: info.location.key(),
            });
          }
        });
      },
    },

    NamedSchemas: {
      Schema(schema, { location, key }) {
        components.set(location.absolutePointer, { used: false, location, name: key.toString() });
      },
    },
  };
};
```

### Registering a new rule

After creating the rule file, register it in the spec index:

```ts
// packages/core/src/rules/oas3/index.ts
import { NoMyRule } from './no-my-rule.js';

export const Oas3Rules = {
  // ...existing rules...
  'no-my-rule': NoMyRule,
};
```

### Configurable rules (Assertions)

Users can define their own rules in `redocly.yaml` using the built-in `Assertion` system (`packages/core/src/rules/common/assertions/asserts.ts`). Instead of writing TypeScript, the user declares a subject node type and a set of assertion checks. Internally, the subject type is converted into a visitor automatically.

```yaml
rules:
  rule/path-exclude-pattern:
    subject:
      type: Paths # node type → becomes a visitor
    assertions:
      notPattern: \/wrong
```

Prefer implementing actual rule code over adding assertion-based rules when contributing to the core rule set.

---
