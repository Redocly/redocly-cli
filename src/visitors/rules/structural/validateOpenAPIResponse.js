class ValidateOpenAPIResponse {
  static get rule() {
    return 'oas3-schema/response';
  }

  get validators() {
    return {
      description(node, ctx) {
        return !node.description ? ctx.createError(ctx.messageHelpers.missingRequiredField('description'), 'key') : null;
      },
    };
  }

  OpenAPIResponse() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIResponse;
