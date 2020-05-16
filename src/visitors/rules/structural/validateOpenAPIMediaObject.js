class ValidateOpenAPIMediaObject {
  static get rule() {
    return 'oas3-schema/media-object';
  }

  get validators() {
    return {
      example(node, ctx) {
        if (node.example && node.examples) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['example', 'examples']),
            reportOnKey: true,
          });
        }
        return null;
      },
      examples(node, ctx) {
        if (node.example && node.examples) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['examples', 'example']),
            reportOnKey: true,
          });
        }
        return null;
      },
    };
  }

  OpenAPIMediaObject(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIMediaObject;
