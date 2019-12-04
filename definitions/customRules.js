class ValidateOpenAPIParameterWithAllOf {
  static get rule() {
    return 'parameterWithAllOf';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        let validators = {};

        if (Object.keys(node).length === 1) {
          validators = {
            description: ctx.getRule('oas3-schema/parameter').validators.description,
          };
        } else {
          validators = {
            ...ctx.getRule('oas3-schema/parameter').validators,
            description: null,
          };
        }

        const fieldMessages = ctx.validateFieldsHelper(validators);
        result.push(...fieldMessages);

        return result;
      },
    };
  }
}

module.exports = [
  ValidateOpenAPIParameterWithAllOf,
];
