# Custom visitors

### Concepts

#### Type definitions

`openapi-cli` in its core has a type tree which defines the structure of the OpenAPI definition. `openapi-cli` then uses it to do type-aware traversal of OpenAPI Document.

Type tree is built from top level `Types` which can link to child types.

TBD

This tree can be modified.

### Extending type definitions

Type tree can be extended using js file which is passed as `typeExtension` parameter in the config. It should follow such pattern (similar to reducers):

```js
export const id = 'customTypes'; // exported id is used as a "namespace" for the whole file, which can include rules, transformers and types extensions

export const typeExtension = {
  oas3(types, version){ 
    return {
      ...types,
      XDemoCredentials: {
        properties: {
          login: {
            type: 'string',
          },
          password: {
            type: 'string',
          },
        },
      },
      DefinitionRoot: {
        ...types.DefinitionRoot,
        properties: {
          ...types.DefinitionRoot.properties,
          'x-demoCredentials': 'XDemoCredentials'
        }
      }
    }
  },
};
```

and include it in your `.redocly.yaml`:

```yaml
lint:
  plugins:
    - './customTypes.js'
```

### Custom rules (visitors)

You can create a custom rule by defining which of the `Types` it should enter. For example, create a file `customRule.js` like following:

```js
export const id = 'customRule'; // exported id is used as a "namespace" for the whole file, which can include rules, transformers and types extensions

export const rules = {
  oas3: { // specify oas version, either "oas3" or "oas2"
    'operation-id-not-test': () => {
      return {
        Operation(operation, { report, location }) {
          if (operation.operationId === 'test') {
            report({
              message: `operationId must be not "test"`,
              location: location.append('operationId'),
            });
          }
        },
      };
    },
  },
};
```

and include it in your `.redocly.yaml`:

```yaml
lint:
  plugins:
    - './customRule.js'
  rules:
    operation-id-not-test: warning
```

After that, whenever you run validation the `operation-id-not-test` will be run as well.

#### report()

The `report` function which is passed to a rule can be called as simple as:
```js
report({
  messsage: 'Your error message',
})
```

However, it can take several additional arguments:
- `location` – to customize location of the error. The most common usecase would be to call `.append([your list])` on the `location` passed to the rule. By doing so you can emulate going down the tree to create error on its lower levels.
- `reportOnKey:boolean` – pass `true` if you want to generate an error (and respective) codeframe on a key (e.g. schema name) instead of a value itself