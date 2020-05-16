class ValidateOpenAPIDiscriminator {
  static get rule() {
    return 'oas3-schema/discriminator';
  }

  get validators() {
    return {
      propertyName(node, ctx) {
        if (!(node && node.propertyName)) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('propertyName'),
            reportOnKey: true,
          });
        }
        if (typeof node.propertyName !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      mapping(node, ctx) {
        if (node && node.mapping && typeof node.mapping !== 'object') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, string]'),
          });
        }
        if (node && node.mapping
          && Object.keys(node.mapping).filter((key) => typeof node.mapping[key] !== 'string').length !== 0) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, string]'),
          });
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
