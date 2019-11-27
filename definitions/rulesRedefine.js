class ValidateOpenAPIParameter {
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
            description: ctx.allRules.filter((r) => r.rule === 'oas3-schema/parameter')[0].validators.description,
          };
        } else {
          validators = {
            ...ctx.allRules.filter((r) => r.rule === 'oas3-schema/parameter')[0].validators,
            description: null,
          };
        }

        const fieldMessages = ctx.validateFields({ level: 4 }, validators, 'parameterWithAllOf');
        result.push(...fieldMessages);

        return result;
      },
    };
  }
}

module.exports = [
  ValidateOpenAPIParameter,
];
