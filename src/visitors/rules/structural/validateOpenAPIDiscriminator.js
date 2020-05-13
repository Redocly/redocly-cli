class ValidateOpenAPIDiscriminator {
  static get rule() {
    return 'oas3-schema/discriminator';
  }

  get validators() {
    return {
      propertyName(node, ctx) {
        if (!(node && node.propertyName)) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('propertyName'), 'key');
        }
        if (typeof node.propertyName !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      mapping(node, ctx) {
        if (node && node.mapping && typeof node.mapping !== 'object') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, string]'), 'value');
        }
        if (node && node.mapping
          && Object.keys(node.mapping).filter((key) => typeof node.mapping[key] !== 'string').length !== 0) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, string]'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPIDiscriminator(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIDiscriminator;
