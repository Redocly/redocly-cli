---
title: Custom plugins and rules in Redocly CLI
redirectFrom:
  - /docs/cli/custom-rules/
  - /docs/cli/resources/custom-rules/
---

# Custom plugins and rules

Custom plugins are a powerful way to extend Redocly that requires knowledge of the OpenAPI spec, JavaScript, and the plugin interface.
Redocly recommends using the highly configurable [custom rules](../rules/custom-rules.md) as a first option before creating a custom plugin.

## Concepts

Extend the CLI through the use of custom plugins.
There are three main differences between preprocessors, rules and decorators.

1. The order of execution:

    ```mermaid
    graph LR
        A(1. preprocessors) ==> B(2. rules)
        B ==> V(3. decorators)
        style A fill:#codaf9,stroke:#0044d4,stroke-width:4px
        style B fill:#codaf9,stroke:#0044d4,stroke-width:4px
        style V fill:#codaf9,stroke:#0044d4,stroke-width:4px
    ```
1. Decorators don't execute for the `lint` command.
1. Preprocessors and decorators do not support nested visitors.

### Plugins
A plugin defines a configuration and set of rules, preprocessors and decorators.

Plugins need to be explicitly defined in the configuration file (except for the Redocly built in plugins).

Plugins configurations are enabled by adding to the `extends` list of the configuration.

```yaml
plugins:
  - 'my-plugin.js'
extends:
  - recommended
  - my-plugin/all
```

### Preprocessors

Use when you need to transform your API definition prior to validation.
Preprocessors are brittle and error prone because validation occurs **after** preprocessing.
We recommend avoiding preprocessing.

### Rules

Rules handle the typical linting responsibility to raise problems to awareness.

### Decorators

Use decorators to add or remove content to the API definition during the bundle process.
Some examples:
- add code samples
- add corporate links
- remove internal paths and schema
- remove internal specification extensions

# Custom rules

Each rule is a function that accepts rule config and returns an object with methods that Redocly CLI calls to "visit" nodes while traversing the definition document.

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

See an example of a custom rule implementation in our ["Response contains property" custom rule](../guides/response-contains-property.md).


## Format of visitor

Keys of the object can be any of the following:

- node type - visitor will be called on specific node type. List of available node types for each specific OAS version:
  - OAS 3.1: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas3_1.ts#L209
  - OAS 3.0: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas3.ts#L530
  - OAS 2.0: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas2.ts#L367
- `any` - visitor will be called on every node
- `ref` - visitor will be called on $ref nodes

The value of each node can be either **visitor function** (runs while going down the tree) or **visitor object** (see below).

## Visitor object
Visitor object can contain `enter` and/or `leave` visitor functions and `skip` predicate method.

Redocly CLI calls `enter` **visitor function** while going down the tree and `leave` going up the tree.
`skip` predicate is called and if it returns `true` the node is ignored for this visitor.


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

Also, visitor object (if it is not `any` or `ref`) can define [nested visitors](#nested-visitors).

## Visitors execution and $ref

Top level **visitor functions** run only once for each node. If the same node is referenced via $ref multiple times top-level **visitor functions** will be executed only once for this node.

This works fine for most context-free rules which check basic things. If you need contextual info you should use [nested visitors](#nested-visitors).

## Nested visitors

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

The `Schema` **visitor function** will be called by Redocly CLI if only Schema Object is encountered while traversing a tree while the Operation Object is **entered**.

As the third argument, the **visitor function** accepts the `parents` object with corresponding parent nodes as defined in the **visitor object**.

<div class="attention"> It will be executed only for the first level of Schema Object.</div>

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
type object from get
type number from put
```

## The context object

The context object contains additional functionality that is helpful for rules to do their jobs. As the name implies, the context object contains information that is relevant to the context of the rule. The context object has the following properties:

- `location` - current location in the source document. See [Location Object](#location-object)
- `parentLocations` - mapping of parent node to its location (only for nested visitors)
- `type` - information about current type from type tree
- `parent` - parent object or array
- `key` - key in parent object or array
- `oasVersion` specific OAS minor version of current document (can be `oas2`, `oas3` or `oas3_1`).


Additionally, the context object has the following methods:

- `report(descriptor)` - reports a problem in the definition (see the dedicated section).
- `resolve(node)` - synchronously dereferences $ref node to its value. Works only with $refs from the original document. If you need to resolve a reference from another source, you can use the optional second parameter: `resolve(node, from: string)`.


## Location Object

The Location class has the following fields:

- `source` - current document source
- `pointer` - pointer within the document to the node
- `absolutePointer` - absolute pointer to the node (including source document absolute ref)

and the following methods:

- `key()` - returns new Location pointing to the current node key instead of value (used to highlight the key in codeframes)
- `child(propName)` - returns new Location pointing to the `propName` of the current node. `propName` can be array of strings to point deep.


## context.report()

The main method you'll use is `context.report()`, which publishes a warning or error (depending on the configuration being used). This method accepts a single argument, which is an object containing the following properties:

- `message` - {string} the problem message.
- `location` - {Location} (optional) an object specifying the location of the problem. Can be constructed using location object methods.
- `suggest` - {string[]} (optional) - "did you mean" suggestion
- `from` - {Location} (optional) - referenced by location

You may use the message alone:

```js
context.report({
  message: "Unexpected identifier"
});
```

By default, the message is reported at the current node location.

# Custom plugins

Plugins can be used to extend behavior of `@redocly/cli`.
Each plugin is a JavaScript module which can export custom rules, preprocessors, decorators or type tree extensions.

## Plugin structure

The minimal plugin should export `id` string:

```js
module.exports = {
  id: 'my-local-plugin'
}
```

## OAS major versions

Everything that is exported from plugin can be related to one of supported OAS major versions. It is done by exporting object containing key-value mapping from major OAS version (`oas2` or `oas3` are supported) to the extension object (rules, preprocessors, decorators).

Before processing the definition document Redocly CLI detects the OAS version and applies corresponding set of extensions.

## Rules in plugins

Plugins can expose additional rules for use in Redocly CLI.
To do so, the plugin must export a `rules` object containing a key-value mapping of rule ID to rule.
The rule ID does not have to follow any naming convention (so it can be `tag-name`, for instance).
Sample rules definition:

```js
module.exports = {
  id: 'my-local-plugin',
  rules: {
    oas3: {
      'tag-name': () => {
        //...
      },
    }
    oas2: {}
  }
}
```

To use the rule in Redocly CLI, you would use the plugin name, followed by a slash, followed by the rule name.
So if this plugin id is `my-local-plugin`, then in your configuration you'd refer to the rule by the name `my-local-plugin/tag-name`.
Example: `"rules": {"my-local-plugin/tag-name": "error"}`.


## Preprocessors and decorators in plugins

In order to create a preprocessor or decorators, the object that is exported from your module has to conform to the following interface:

```js
module.exports = {
  id: 'my-local-plugin`,
  preprocessors: {
    oas3: {
      "processor-id": () => {
        // ...
      }
    }
  },
  decorators: {
    oas3: {
      "decorator-id": () => {
        // ...
      }
    }
  }
}
```

See an examples of decorators:
- Read our [how-to hide APIs guide](../guides/hide-apis.md) with our [remove-x-internal decorator](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/remove-x-internal.ts) implementation.
- Follow our [replace-servers-url tutorial](../guides/replace-servers-url.md).
- Change your [OAuth2 token URL](../guides/change-token-url.md).
- Learn how to [hide OpenAPI specification extensions](../guides/hide-specification-extensions.md).

## Configs in plugins

Bundle configurations inside a plugin by specifying them under the `configs` key.
Multiple configurations are supported per plugin.
It is not possible to specify a default configuration for a given plugin.
Users must specify the configuration they want to use in their configuration file.

```js
module.exports = {
  id: 'my-local-plugin'
  configs: {
    all: {
      rules: {
        'operation-id-not-test': 'error',
        'boolean-parameter-prefixes': 'error',
      },
    },
    minimal: {
      rules: {
        'operation-id-not-test': 'off',
        'boolean-parameter-prefixes': 'error',
      },
    }
  }
};
```

If the example plugin above id was `my-local-plugin`, the `all` and `minimal` configurations would then be usable by extending off of `"my-local-plugin/all"` and `"my-local-plugin/minimal"`, respectively.

```yaml
extends:
  - my-local-plugin/all
```

## Type extensions in plugins

See [type extensions](#type-extensions)

Define type extensions by exporting the `typeExtension` property:

```js
module.exports = {
  id: 'my-local-plugin',
  typeExtension: {
    oas3(types) {
      // modify types here
      return {
        ...types,
        // add new or modify existing
      };
    },
  }
};
```

## Share plugins

Community plugins are not supported yet.

# Type extensions

## Type definitions

Redocly CLI in its core has a type tree which defines the structure of the OpenAPI definition.
Redocly CLI then uses it to do type-aware traversal of OpenAPI Document.

The type tree is built from top level `Types` which can link to child types.

<!-- TBD -->

This tree can be extended or modified.

## Extending type definitions

The type tree can be extended by exporting the `typeExtension` function from a custom plugin.
Follow this pattern (similar to reducers if you're familiar with the map-reduce pattern):

```js
exports.typeExtension = {
  oas3(types) {
    // modify types here
    return {
      ...types,
      // TBD
    };
  },
};
```
