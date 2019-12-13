/* eslint-disable max-classes-per-file */
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

class ParameterWithAllOfRule {
  static get rule() {
    return 'parameterWithAllOf';
  }

  constructor(config) { // config can be passed via rules.parameterWithAllOf in config file
    this.maxItems = (config && config.maxItems) || 2;
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
