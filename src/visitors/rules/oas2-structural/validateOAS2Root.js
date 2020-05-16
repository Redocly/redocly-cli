class ValidateOpenAPIRoot {
  static get rule() {
    return 'oas2-schema/root';
  }

  get validators() {
    return {
      info(node, ctx) {
        if (node && !node.info) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('info'),
            reportOnKey: true,
          });
        }
      },
      paths(node, ctx) {
        if (node && !node.paths) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('paths'),
            reportOnKey: true,
          });
        }
      },
      host(node, ctx) {
        if (node.host && typeof node.host !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      basePath(node, ctx) {
        if (node.basePath && typeof node.basePath !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      schemes(node, ctx) {
        if (!node || !node.schemes) return null;

        if (node && node.schemes && !Array.isArray(node.schemes)) {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
        }

        for (let i = 0; i < node.schemes.length; i++) {
          if (typeof node.schemes[i] !== 'string') {
            ctx.path.push(i);
            ctx.report({
              message: 'Items of the schemes array must be strings in the OAS2 Root object.',
            });
            ctx.path.pop();
          }
        }

        for (let i = 0; i < node.schemes.length; i++) {
          if (['http', 'https', 'ws', 'wss'].indexOf(node.schemes[i]) === -1) {
            ctx.path.push(i);
            ctx.report({
              message: 'Items of the schemes array can only be: "http", "https", "ws", "wss".',
            });
            ctx.path.pop();
          }
        }
        return null;
      },
      consumes(node, ctx) {
        if (!node || !node.consumes) return;


        if (node && node.consumes && !Array.isArray(node.consumes)) {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
          return;
        }

        for (let i = 0; i < node.consumes.length; i++) {
          if (typeof node.consumes[i] !== 'string') {
            ctx.path.push(i);
            ctx.report({
              message: 'Value MUST be a string and as described under Mime Types.',
            });
            ctx.path.pop();
          }
        }
      },
      produces(node, ctx) {
        if (!node || !node.produces) return;


        if (node && node.produces && !Array.isArray(node.produces)) {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
          });
          return;
        }

        for (let i = 0; i < node.produces.length; i++) {
          if (typeof node.produces[i] !== 'string') {
            ctx.path.push(i);
            ctx.report({
              message: 'Value MUST be a string and as described under Mime Types.',
            });
            ctx.path.pop();
          }
        }
      },
    };
  }

  OAS2Root(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIRoot;
