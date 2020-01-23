# Custom visitors

### Concepts

#### Type definitions

`openapi-cli` in its core has a type tree which defines the structure of the OpenAPI definition. `openapi-cli` then uses it to do type-aware traversal of OpenAPI Document.

Type tree is built from top level `Types` which can link to child types:
It looks like below:

```js
{
  // ...
  OpenAPIParameter: {
    isIdempotent: false, // we will remove this later, this is temporary hack. ...
    properties: {
      name: null, // null means it's a leaf
      in: null,
      description: null,
      required: null,
      deprecated: null,
      allowEmptyValue: null,
      style: null,
      explode: null,
      allowReserved: null,
      example: null,
      schema: 'OpenAPISchemaObject', // name of the type linked this field
      content: 'OpenAPIMediaTypeObject',
      examples: 'OpenAPIExampleMap',
    },
    resolveType: (node, definition, ctx) => 'SomeOtherParameterType', // optional function used to dynamically resolve the type of the node based on node/definition/ctx.
  },
  // ....
}
```

This tree can be modified.

#### Rules (visitors)

All the checks are built as visitors. Each rule is a class that registers one or more visitors for some types from type tree:

```js
class OperationDescription {
  static get rule() {
    return 'operation-description'; // you can configure the rule by this name in config file
  }


  OpenAPIOperation() {
    return {
      onEnter: (node, typeDef, ctx) => {
        if (!node.description) {
          return [ctx.createError(`The field 'description' must be present on this level`), 'key')];
        }
        return [];
      },
	  onExit: (node, typeDef, ctx) => {
        // ...
      }
    };
  }
}
```

### Extending type definitions

Type tree can be extended using js file which is passed as `typeExtension` parameter in the config. It should follow such pattern (similar to reducers):

```js
module.exports = (types) => ({
  ...types,
  OpenAPIParameter: {
    ...types.OpenAPIParameter,
    // enable dynamic type resolution for OpenAPIParameter and return either OpenAPIParameterWithAllOf or regular OpenAPIParameter
    resolveType: node => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
  },
  // define OpenAPIParameterWithAllOf
  OpenAPIParameterWithAllOf: {
    properties: {
      allOf: 'OpenAPIParameterPartial',
    },
  },
  // define OpenAPIParameterPartial
  OpenAPIParameterPartial: {
    ...types.OpenAPIParameter,
  },
});
```

### Adding custom rules

To add custom rules user should create another `js` file and set it as `customRules` param in the config. The `js` file should export array of custom rules:

```js
class ValidateOpenAPIParameterPartial {
  static get rule() {
    return 'parameterPartial';
  }

  // register visitor on a new type OpenAPIParameterPartial
  OpenAPIParameterPartial() {
    return {
      onEnter: (node, type, ctx) => {
        const result = [];
        let validators = {};
        if (Object.keys(node).length === 1 && node.description) {
          // reuse existing code for fields for structural rules code by name
          validators = {
            description: ctx.getRule('oas3-schema/parameter').validators.description,
          };
        } else {
          // reuse existing code for fields for structural rules code by name
          validators = {
            ...ctx.getRule('oas3-schema/parameter').validators,
          };
        }

        const fieldMessages = ctx.validateFieldsHelper(validators);
        result.push(...fieldMessages);
        
        // example of some custom validations (just as an example)
        if (node.in && node.in !== 'header') {
          ctx.path.push('in');
          result.push(ctx.createError('Only header parameters can be extended with allOf', 'key'));
          ctx.path.pop();
        }
        return result;
      },
    };
  }
}

// Example of another rule
class ParameterWithAllOfRule {
  static get rule() {
    return 'parameterWithAllOf';
  }

  constructor(config) { // config can be passed via rules.parameterWithAllOf in config file
    this.maxItems = config.maxItems || 2;
  }

  OpenAPIParameterWithAllOf() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        if (node.allOf.length > this.maxItems) {
          ctx.path.push('allOf');
          result.push(ctx.createError(`Do not use more that ${this.maxItems} items in allOf for OpenAPI Parameter`, 'key'));
          ctx.path.pop();
        }
        return result;
      },
    };
  }
}
module.exports = [
  ValidateOpenAPIParameterPartial, ParameterWithAllOfRule,
];

```

User can provide configuration file `.redocly.yaml` in current working dir.

```yaml
lint:
  typeExtension: typeExtension.js # relative path to the extended types
  customRules: customRules.js # relative path to the custom visitors
  rules:
    parameterPartial: warning # allowed values are 'error', 'warning' and 'off'
    parameterWithAllOf: off # by default custom rules are 'on' and set to 'error' severity
```
