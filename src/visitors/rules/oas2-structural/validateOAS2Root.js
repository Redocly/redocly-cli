class ValidateOpenAPIRoot {
  static get rule() {
    return 'oas2-schema/root';
  }

  get validators() {
    return {
      info(node, ctx) {
        if (node && !node.info) return ctx.createError(ctx.messageHelpers.missingRequiredField('info'), 'key');
        return null;
      },
      paths(node, ctx) {
        if (node && !node.paths) return ctx.createError(ctx.messageHelpers.missingRequiredField('paths'), 'key');
        return null;
      },
      host(node, ctx) {
        if (node.host && typeof node.host !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      basePath(node, ctx) {
        if (node.basePath && typeof node.basePath !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      schemes(node, ctx) {
        if (!node || !node.schemes) return null;

        const errors = [];

        if (node && node.schemes && !Array.isArray(node.schemes)) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
        }

        for (let i = 0; i < node.schemes.length; i++) {
          if (typeof node.schemes[i] !== 'string') {
            ctx.path.push(i);
            errors.push(ctx.createError('Items of the schemes array must be strings in the OAS2 Root object.', 'value'));
            ctx.path.pop();
          }
        }

        for (let i = 0; i < node.schemes.length; i++) {
          if (['http', 'https', 'ws', 'wss'].indexOf(node.schemes[i]) === -1) {
            ctx.path.push(i);
            errors.push(ctx.createError('Items of the schemes array can only be: "http", "https", "ws", "wss".', 'value'));
            ctx.path.pop();
          }
        }
        return errors;
      },
      consumes(node, ctx) {
        if (!node || !node.consumes) return null;

        const errors = [];

        if (node && node.consumes && !Array.isArray(node.consumes)) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
        }

        for (let i = 0; i < node.consumes.length; i++) {
          if (typeof node.consumes[i] !== 'string') {
            ctx.path.push(i);
            errors.push(ctx.createError('Value MUST be a string and as described under Mime Types.', 'value'));
            ctx.path.pop();
          }
        }

        return errors;
      },
      produces(node, ctx) {
        if (!node || !node.produces) return null;

        const errors = [];

        if (node && node.produces && !Array.isArray(node.produces)) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
        }

        for (let i = 0; i < node.produces.length; i++) {
          if (typeof node.produces[i] !== 'string') {
            ctx.path.push(i);
            errors.push(ctx.createError('Value MUST be a string and as described under Mime Types.', 'value'));
            ctx.path.pop();
          }
        }

        return errors;
      },
    };
  }

  OAS2Root() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIRoot;
