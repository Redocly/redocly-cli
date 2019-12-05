class ValidateOpenAPIMediaObject {
  static get rule() {
    return 'oas3-schema/media-object';
  }

  get validators() {
    return {
      example(node, ctx) {
        return node.example && node.examples ? ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['example', 'examples']), 'key') : null;
      },
      examples(node, ctx) {
        return node.example && node.examples ? ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['examples', 'example']), 'key') : null;
      },
    };
  }

  OpenAPIMediaObject() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIMediaObject;
