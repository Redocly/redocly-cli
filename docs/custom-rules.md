# Custom rules

Each rule is a function  that accepts rule config and returns an object with methods that openapi-cli calls to "visit" nodes while traversing the defintion document.

Here is the basic example of a rule:

```js
function OperationIdNotTest() {
  return {
    Operation(operation, ctx) {
      if (operation.operationId === 'test') {
        ctx.report({
          message: `operationId must be not "test"`,
          location: ctx.location.child('operationId'),
        });
      }
    },
  };
}
```

## Format of visitor

Keys of the object can be any of the following:

- node type - visitor will be called on specific node type. List of available node types for speicific OAS3 version:
  TODO: update the link below once merged
  - OAS3: https://github.com/Redocly/openapi-cli/blob/full-rewrite/src/types/oas3.ts#L518-L560
  - OAS2: not supported yet
- `any` - visitor will be called on every node
- `ref` - visitor will be called on $ref nodes

The value of each node can be either **visitor function** (runs while going down the tree) or **visitor object** (see below).

## Visitor Object
Visitor object can contain `enter` and/or `leave` visitor functions and `skip` predicate method.

openapi-cli calls `enter` **visitor function** while going down the tree and `leave` going up the tree.
`skip` predidate is called and if it returns `true` the node is is ignored from this visitor.


```js
function ExampleRule() {
  const seen = {};
  return {
    DefinitionRoot: {
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

Also, visitor object (if it is not `any` or `ref`) can define [nested visitors](#nested-visitors).

## Visitors execution and $ref

Top level **visitor functions** run only once for each node. If the same node is referenced via $ref multiple times top-level **visitor functions** will be executed only once for this node.

This works fine for most context-free rules which check basic things. If you need contextual info you should use [nested visitors](#nested-visitors).

## Nested Visitors

Here is basic example of nested visitor:

```js
function ExampleRule() {
  const seen = {};
  return {
    Operation: {
      // skip: (value, key) => ... // if needed
      // enter(operation) {} // if needed
      Schema(schema, ctx, parents) {
        console.log(`type ${schema.type} from ${parents.Operation.operationId}`)
      }
    }
  };
}
```

The `Schema` **visit function** will be called by openapi-cli if only Schema Object is encountered while traversing a tree ahile Operation Object is **entered**.

As the third argument the **visitor function** accpets the `parents` object with corresponding parent nodes as defined in the **visitor object**.


> Note: it will be executed only for the first level of Schema Object.

For the example document below:

```yaml
get:
  operationId: get
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
  operationId: put
  parameters:
    - name: a
      in: path
      schema:
        type: number
```

The visitor above will log the following:

```
type string from get
tpye object from get
type number from put
```

## The Context Object

The context object contains additional functionality that is helpful for rules to do their jobs. As the name implies, the context object contains information that is relevant to the context of the rule. The context object has the following properties:

- `location` - current location in the source document. See [Location Object](#location-object)
- `parentLocations` - mapping of parent node to its location (only for nested visitors)
- `type` - information about current type from type tree
- `parent` - parent object or array
- `key` - key in parent object or array
- `oasVersion` specific OAS minor version of current document (can be `oas2`, `oas3` or `oas3_1`).


Additionally, the context object has the following methods:

- `report(descriptor)` - reports a problem in the definition (see the dedicated section).
- `resolve(node)` - synchornosly dereferences $ref node to its value. Works only with $refs from the original document.


## Location Object

Location is the class with the folowing fields:

`source` - current document source
`pointer` - pointer within the document to the node
`abolutePointer` - absolute pointer to the node (including source document absolute ref)

and the following methods:

`key()` - returns new Location pointing to the current node key instead of value (used to highlight the key in codeframes)
`child(propName)` - returns new Location pointing to the `propName` of the current node. `propName` can be array of strings to point deep.


## context.report()

The main method you'll use is `context.report()`, which publishes a warning or error (depending on the configuration being used). This method accepts a single argument, which is an object containing the following properties:

`message` - {string} the problem message.
`location` - {Location} (optional) an object specifying the location of the problem. Can be constructed using location object methods.
`suggest` - {string[]} (optional) - "did you mean" suggestion
`from` - {Location} (optional) - referenced by location

The simplest example is to use just message:

```js
context.report({
  message: "Unexpected identifier"
});
```

By default, the message is reported at the current node location.