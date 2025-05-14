# Decorators in plugins

Decorators transform API descriptions, by adding, removing, or changing elements of the document. Before you build your own decorators:

- [Learn about Redocly decorators](../decorators.md).
- [Check the list of built-in decorators](../decorators.md#list-of-decorators).

If you can't find an existing decorator that fits your needs, then you can add a decorator in a plugin.

{% admonition type="warning" name="Preprocessors" %}
Decorators and preprocessors are the same in structure, but preprocessors are run _before_ linting, and decorators are run after. We always recommend using decorators where possible, since the document might not be valid or structured as expected if the linting step hasn't run yet.
{% /admonition %}

## Plugin structure

To create a preprocessor or decorator, the function that is exported from your module has to conform to an interface such as the following example:

```js
module.exports = function myLocalPlugin() {
  return {
    id: 'my-local-plugin',
    preprocessors: {
      oas3: {
        'processor-id': () => {
          // ...
        },
      },
    },
    decorators: {
      oas3: {
        'decorator-id': () => {
          // ...
        },
      },
    },
  };
};

```

Each decorator or preprocessor is a function that returns an object. The object's keys are the node types in the document, and each of those can contain any or all of the `enter()`, `leave()` and `skip()` functions for that node type. Find more information and examples on the [visitor pattern page](./visitor.md).

## Decorator example

To give a small (but fun) example, here is a decorator that adds a sparkle emoji ✨ at the start of every operation description.

To help keep the plugin code organized, this example uses one file per decorator. In this example, this is the file `plugins/decorators/operation-sparkle.js`:

```js
module.exports = OperationSparkle;

function OperationSparkle() {
  console.log("adding sparkles ... ");
  return {
    Operation: {
      leave(target) {
        if(target.description) {
          target.description = "✨ " + String(target.description);
        }
      }
    },
  }
};
```

Decorators use the [visitor pattern](./visitor.md) to run an operation on every node in the document. In this example, when the code executes the `leave()` function on the `Operation` node, it checks if the node (passed as `target` in this example) has a description, and updates it if it does.

To use this decorator, add it to a plugin. In this example the main decorator file is `plugins/sparkle.js`:

```js
const OperationSparkle = require('./decorators/operation-sparkle.js');

module.exports =  function sparklePlugin() {
  return {
    id: "sparkle",
    decorators: {
      oas3: {
        "operation-sparkle": OperationSparkle,
      },
    },
  };
}
```

The plugin is good to go. For a user to include it in their Redocly configuration, edit the configuration file to look something like this:

```yaml
plugins:
  - plugins/sparkle.js

decorators:
  sparkle/operation-sparkle: on
```

## Decorator example with parameters

A common use case is a decorator that can accept input values to be used during processing. This example decorator adds a suffix to all OperationIds in the document. Since every use case is different, the user can configure what should be used for the `suffix` value.

Here's the decorator code, in a file named `plugins/decorations/add-suffix.js` and it expects a configuration option named `suffix`:

```js
module.exports = OpIdSuffix;

function OpIdSuffix({suffix}) {
  console.log("updating OperationIds ... ");
  return {
    Operation: {
      leave(target) {
        if(target.operationId) {
          target.operationId = target.operationId + suffix;
        }
      }
    },
  }
};
```

The `suffix` configuration option is automatically passed in, and it can be used in the function.

Now extend the decorator from the previous example to add this to the existing plugin in `plugins/sparkle.js`:

```js
const OperationSparkle = require('./decorators/operation-sparkle.js');
const OpIdSuffix = require('./decorators/add-suffix.js');

module.exports = function sparklePlugin() {
  return {
    id: "sparkle",
    decorators: {
      oas3: {
        "operation-sparkle": OperationSparkle,
        "add-opid-suffix": OpIdSuffix,
      },
    },
  };
}
```

All that remains is for a user to configure this decorator in their `redocly.yaml` configuration file to take advantage of the new decorator functionality. Here's an example of the configuration file:

```yaml
plugins:
  - plugins/sparkle.js

decorators:
  sparkle/operation-sparkle: on
  sparkle/add-opid-suffix:
    suffix: ButShinier
```

With this configuration, an `operationId` called `GetAllItems` would be rewritten as `GetAllItemsButShinier`. You can choose a more sensible suffix for your use case as appropriate.

## Further examples of custom decorators

See some more examples of decorators:

- There's a [Redocly CLI cookbook](https://github.com/Redocly/redocly-cli-cookbook) containing many more examples and ready-to-use scripts from our community.
- Follow our [replace-servers-url tutorial](../guides/replace-servers-url.md).
- Change your [OAuth2 token URL](../guides/change-token-url.md).

## Decorator execution order

The order in which decorators are executed is important and can affect the final output of your API description.
Here are the key points to understand:

- For each decorator, the `enter` function is always executed before the `leave` function.
- The order of decorator execution is determined by:
  1. The order of plugins as listed in the `plugins` array in `redocly.yaml` configuration file.
  1. The order of decorators as defined in the `decorators` object of each plugin.

The order in the `decorators` section of `redocly.yaml` **DOES NOT** affect the order in which the decorators are executed.

### Example

If you have two plugins defined as follows:

```js
// plugins/plugin1.js
export default function plugin1() {
  return {
    id: 'plugin1',
    decorators: {
      oas3: {
        decoratorB,
        decoratorA,
      },
    },
  };
}
```

```js
// plugins/plugin2.js
export default function plugin2() {
  return {
    id: 'plugin2',
    decorators: {
      oas3: {
        decoratorC,
      },
    },
  };
}
```

And your `redocly.yaml` has this configuration:

```yaml
plugins:
  - plugins/plugin2.js
  - plugins/plugin1.js

decorators:
  plugin1/decoratorA: on
  plugin1/decoratorB: on
  plugin2/decoratorC: on
```

## Preprocessors

Preprocessors follow the same structure and operation as decorators, but they are run before the validation/linting step. Running before the validation/linting step makes them brittle because the document may not be valid, and the extra processing step can cause performance impacts. We recommend looking for alternative approaches to preprocessing.

Some advanced use cases do require preprocessing, which is why the functionality is provided for those users.
