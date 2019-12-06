class ValidateOpenAPILink {
  static get rule() {
    return 'oas3-schema/link';
  }

  get validators() {
    return {
      operationRef(node, ctx) {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['operationRef', 'operationId']), 'key');
        if (typeof node.operationRef !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      operationId(node, ctx) {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['operationId', 'operationRef']), 'key');
        if (typeof node.operationId !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('Map[string, any]'), 'value');
        }
        return null;
      },
      description(node, ctx) {
        if (!node || !node.description) return null;
        if (typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
    };
  }

  OpenAPILink() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPILink;
