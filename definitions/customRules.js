/* eslint-disable max-classes-per-file */
class ValidateOpenAPIParameterPartial {
  static get rule() {
    return 'parameterPartial';
  }

  OpenAPIParameterPartial() {

    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        let validators = {};
        if (Object.keys(node).length === 1 && node.description) {
          validators = {
            description: ctx.getRule('oas3-schema/parameter').validators.description,
          };
        } else {
          validators = {
            ...ctx.getRule('oas3-schema/parameter').validators,
          };
        }
        if (node.in && node.in !== 'header') { // just as an example
          ctx.path.push('in');
          result.push(ctx.createError('Only header parameters can be extended with allOf', 'key'));
          ctx.path.pop();
        }
        const fieldMessages = ctx.validateFieldsHelper(validators);
        result.push(...fieldMessages);
        return result;
      },
    };
  }
}
class Other {
  static get rule() {
    return 'parameterWithAllOf';
  }

  OpenAPIParameterWithAllOf() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        if (node.allOf.length > 2) {
          ctx.path.push('allOf');
          result.push(ctx.createError('Do not use more that 2 items in allOf for OpenAPI Parameter', 'key' /* whaterver else */));
          ctx.path.pop();
        }
        return result;
      },
    };
  }
}
module.exports = [
  ValidateOpenAPIParameterPartial, Other,
];
