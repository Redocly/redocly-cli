class validateOAS2Operation {
  static get rule() {
    return 'oas2-schema/operation';
  }

  get validators() {
    return {
      tags(node, ctx) {
        if (!node || !node.tags) return null;

        if (node && node.tags && !Array.isArray(node.tags)) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
        }

        for (let i = 0; i < node.tags.length; i++) {
          if (typeof node.tags[i] !== 'string') {
            ctx.path.push(i);
            ctx.report({
              message: 'Items of the tags array must be strings in the OAS2 Operation object.',
            });
            ctx.path.pop();
          }
        }

        return null;
      },
      summary(node, ctx) {
        if (node && node.summary && typeof node.summary !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      operationId(node, ctx) {
        if (node && node.operationId && typeof node.operationId !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      responses: (node, ctx) => {
        if (!node.responses) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('responses'),
            reportOnKey: true,
          });
        }
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
    };
  }

  OAS2Operation(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = validateOAS2Operation;
