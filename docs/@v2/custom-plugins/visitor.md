# Visitor pattern

_Visitor_ is a design pattern that allows operations to be performed on individual elements in a more complex structure. Redocly uses it as the basis for custom plugins where every node in a document must be evaluated, for example when applying rules or decorators.

To understand how this applies to your API description, think of the document as a tree structure. The top level elements are entries like `info` and `components`. To examine the `description` field in the `info` section, the visitor goes to the `info` node first, then on to the `description` node. This pattern is repeated all over the document as the visitor pattern works its way around the document tree.

## Structure of the visitor object

In your plugin, create a JavaScript visitor object, and describe the functionality required for each type of node.

Redocly CLI calls `enter()` while going down the tree and `leave()` going up the tree after processing the node and its children.
If the `skip()` predicate is defined and returns `true` the node is ignored for this visitor.

```js
function ExampleRule() {
  const seen = {};
  return {
    Root: {
      leave() {
        // check something and report
      }
    }
    Operation: {
      enter(operation, ctx) {
        seen[operation.operationId] = true;
      },
    }
  };
}
```

Keys of the object are one of the following:

- document-specific node types, such as the [OpenAPI node types](https://redocly.com/docs/openapi-visual-reference/openapi-node-types/).
- `any` - visitor is called on every node.
- `ref` - visitor is called on $ref nodes.

## Visitors execution and $ref

Top level **visitor functions** run only once for each node.
If the same node is referenced by the $ref multiple times,
top-level **visitor functions** are executed only once for this node.

This works fine for most context-free rules. If you need contextual info you should use [nested visitors](#nested-visitors).

## Nested visitors

The visitor object (if it is not `any` or `ref`) can define nested visitors.

Here is a basic example of a nested visitor:

```js
function ExampleRule() {
  return {
    Operation: {
      Schema: {
        enter(schema, ctx, parents) {
          console.log(`type ${schema.type} from ${parents.Operation.operationId}`)
        }
      }
    }
  };
}
```

The `Schema` **visitor function** is called by Redocly CLI only if the Schema Object is encountered while traversing a tree while the Operation Object is **entered**.

As the third argument, `enter()` in a **nested visitor object** accepts the `parents` object with corresponding parent nodes as defined in the **visitor object**.

{% admonition type="info" %}
It is executed only for the first level of the Schema Object.
{% /admonition %}

For the example document below:

```yaml
get:
  operationId: getOp
  parameters:
    - name: a
      in: path
      schema:
        type: string
  requestBody:
    content:
      application/json:
        schema:
          type: object
          properties:
            a:
              type: boolean
put:
  operationId: putOp
  parameters:
    - name: a
      in: path
      schema:
        type: number
```

The visitor above logs the following:

```sh
type string from getOp
type object from getOp
type number from putOp
```
