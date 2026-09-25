# Diff rules in plugins

A plugin can add [diff rules](../rules/diff-rules.md) for the changes that the built-in rules do not judge.
The [`diff` command](../commands/diff.md) runs a plugin rule in the same way as a built-in rule.

{% admonition type="warning" name="Experimental" %}
Diff rules are an experimental feature.
The plugin interface for diff rules can change in future releases.
{% /admonition %}

## Build the diff rule

A diff rule is a function that returns a visitor, like a [lint rule](./custom-rules.md).
The difference is what the visitor gets: a lint rule visits nodes of one document, and a diff rule visits changes between two documents.
The command calls the visitor once for each change, with the key of the node type that changed.

This example rule reports a tag that was removed from an operation.
It is in the `plugins/rules/tag-removed.js` file:

```js
export default function TagRemoved() {
  return {
    Operation(change, { report }) {
      if (change.kind !== 'modified' || change.property !== 'tags') return;
      const tags = change.revision.value ?? [];
      const removed = (change.base.value ?? []).filter((tag) => !tags.includes(tag));
      if (removed.length) {
        report({ message: `Tags removed: ${removed.join(', ')}.` });
      }
    },
  };
}
```

Add the rule to the `diff` section of the plugin, under `oas3` or `async3`.
This is the `plugins/cafe.js` file:

```js
import TagRemoved from './rules/tag-removed.js';

export default function cafePlugin() {
  return {
    id: 'cafe',
    diff: {
      oas3: {
        'tag-removed': TagRemoved,
      },
    },
  };
}
```

A plugin rule does not run until you give it an impact.
Add the plugin and the impact to `redocly.yaml`:

```yaml
plugins:
  - plugins/cafe.js
extends:
  - diff-recommended
diff:
  cafe/tag-removed: major
```

When you remove a tag from an operation, `redocly diff` reports the change as `major`:

```text
GET /menu
  ✖ major  modified  tags
      Tags removed: public. (cafe/tag-removed)
      at revision.yaml:6:13
```

## The change object

The visitor gets these fields of a change:

| Field      | Description                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `kind`     | `added`, `removed`, or `modified`.                                                                                        |
| `property` | The name of the value that changed on the node. Only a `modified` change has it.                                          |
| `base`     | The `value` and `location` of the node, or of the property, in the base. A change of kind `added` does not have it.       |
| `revision` | The `value` and `location` of the node, or of the property, in the revision. A change of kind `removed` does not have it. |

A change of kind `modified` contains one value that changed, such as `tags` or `required`.
A change of kind `added` or `removed` contains the whole node.

## The context object

| Property      | Description                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report`      | The function that reports the change. It takes a `message`, and an optional `location` to point to another place than the change.                        |
| `directions`  | A list of the directions of the data: `request`, `response`, both, or none. See [Requests and responses](../rules/diff-rules.md#requests-and-responses). |
| `specVersion` | The version of the specification, for example `oas3_1`.                                                                                                  |

Use `directions` when the same change breaks only one side of the API.
For example, this rule reports a new `enum` value only in a response:

```js
export default function EnumValueAdded() {
  return {
    Schema(change, { report, directions }) {
      if (change.kind !== 'modified' || change.property !== 'enum') return;
      if (!directions.includes('response')) return;
      report({ message: 'A response can send a new enum value.' });
    },
  };
}
```

## Visitor keys

- A key is the name of a node type, as in a lint rule.
  To find the type of a node, use the [`inspect-node-types` command](../commands/inspect-node-types.md).
- A nested key limits the rule to the changes below another node type.
  For example, `SchemaProperties: { Schema() {} }` visits the properties of a schema only.
- The `any` key visits every change.
  You can use it only at the top level of the visitor.
- A diff visitor does not support `enter`, `leave`, or `skip`.
