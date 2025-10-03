# Rules in plugins

Rules are used to make sure that the API description is in the expected format and aligns with the expected API standards. Before you build any custom rules:

- Learn more about [Redocly rules](../rules.md).
- Check the list of [built-in rules](../rules/built-in-rules.md).
- See if you can build a [configurable rule](../rules/configurable-rules.md) to meet your needs.

Exhaust the above options first, because they are simpler and more maintainable than building a custom plugin. If you need to build your own rules though, then you're in the right place! Read on ...

## Build the custom rule

Each rule is a function that returns an object with methods that Redocly CLI calls to "visit" nodes while traversing the API description document. The object keys are the node types that are encountered in the document. In this simple example, the custom plugin holds a rule that fails if any `operationId` is set to "test".

To keep the plugin code manageable, each rule can go in its own file. This example is in `plugins/rules/opid-not-test.js`:

```js
module.exports = OperationIdNotTest;

function OperationIdNotTest() {
  return {
    Operation: {
      enter(operation, ctx) {
        if (operation.operationId === 'test') {
          ctx.report({
            message: `operationId must be not "test"`,
            location: ctx.location.child('operationId'),
          });
        }
      },
    }
  };
}
```

The `ctx` object here holds all the context, which can be used to give more situation-aware functionality to the rules you build. This is one of the main use cases for custom rules. The `report()` method is used to give information to return to the user if the node being visited doesn't comply with the rule. You can read the [context](#the-context-object) and [location](#location-object) sections for more information.

Adding this as part of a plugin requires you to add it to the `rules` part of the plugin object returned by the exported function, under the relevant document type.
The example rule here is intended to be used with OpenAPI, so the plugin code in `plugins/my-rules.js` is as follows:

```js
const OperationIdNotTest = require('./rules/opid-not-test.js');

module.exports = function myRulesPlugin() {
  return {
    id: 'my-rules',
    rules: {
      oas3: {
        'opid-not-test': OperationIdNotTest,
      },
    },
  };
};
```

To use the example rule, add the following to your `redocly.yaml` configuration file:

```yaml
plugins:
  - 'plugins/my-rules.js'

rules:
  my-rules/opid-not-test: warn
```

Validate your OpenAPI document with `redocly lint openapi.yaml`. With this rule enabled as shown, any `operationId` fields that are "test" cause the validation step to emit a warning. You can use the example here as a basis for building your own rules, and many rules can be included in a single plugin.

## Object references

### The context object

The context object contains additional functionality that is helpful for rules to do their jobs. As the name implies, the context object contains information that is relevant to the context of the rule. The context object has the following properties:

- `location` - Current location in the source document. See [Location Object](#location-object).
- `parentLocations` - Mapping of the parent node to its location (only for nested visitors).
- `type` - Information about the current type from the type tree.
- `parent` - Parent object or array.
- `key` - Key in the parent object or array.
- `oasVersion` - Specific OAS minor version of the current document (can be `oas2`, `oas3`, `oas3_1`, or `oas3_2`).

The context object also offers some additional functionality to resolve references and to return information about a problem to the user. The methods available are as follows:

- `resolve(node)` - Synchronously dereferences `$ref` node to its value. Works only with `$refs` from the original document. If you need to resolve a reference from another source, you can use the optional second parameter: `resolve(node, from: string)`.
- `report(descriptor)` - Reports a problem in the API description and returns information to the user. See [Report rule context](#report-rule-context) for more information.

## Report rule context

The main method used is `context.report()`, which publishes a warning or error (depending on the configuration being used). This method accepts a single argument, which is an object containing the following properties:

- `message` - {string} The problem message.
- `location` - {Location} (optional) An object specifying the location of the problem. Can be constructed using location object methods.
- `suggest` - {string[]} (optional) - "Did you mean" suggestion.
- `from` - {Location} (optional) - Referenced by location.

You may use the message alone:

```js
context.report({
  message: "Unexpected identifier"
});
```

By default, the message is reported at the current node location.

### Location object

The Location class has the following fields:

- `source` - Current document source.
- `pointer` - Pointer within the document to the node.
- `absolutePointer` - Absolute pointer to the node (including source document absolute ref).

and the following methods:

- `key()` - Returns the new Location pointing to the current node key instead of the value (used to highlight the key in codeframes).
- `child(propName)` - Returns the new Location pointing to the `propName` of the current node. `propName` can be an array of strings to point deep.

You can use this information for more granular rule definitions.
