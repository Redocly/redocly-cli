class ValidateOpenAPILink {
  static get rule() {
    return 'oas3-schema/link';
  }

  get validators() {
    return {
      operationRef(node, ctx) {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['operationRef', 'operationId']),
            reportOnKey: true,
          });
        }
        if (typeof node.operationRef !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      operationId(node, ctx) {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['operationId', 'operationRef']),
            reportOnKey: true,
          });
        }
        if (typeof node.operationId !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, any]'),
          });
        }
        return null;
      },
      description(node, ctx) {
        if (!node || !node.description) return null;
        if (typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
    };
  }

  OpenAPILink(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPILink;
