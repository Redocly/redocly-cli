import createError from '../error';

class UniqueParameterNames {
  static get ruleName() {
    return 'uniqueParameterNames';
  }

  constructor(opts) {
    const { msg = 'example argument' } = opts || {};
    this.msg = msg;
    this.parametersStack = [];
  }

  OpenAPIParameter() {
    return {
      onEnter(node, definition, ctx, instance) {
        let error;
        if (instance.parametersStack.includes(node.name)) {
          ctx.path.push('name');
          error = createError('Duplicate parameters are not allowed. This name already used on higher level.', node, ctx);
          ctx.path.pop();
        }
        instance.parametersStack.push(node.name);
        return error ? [error] : [];
      },

      onExit(node, definition, ctx, instance) {
        if (node.parameters) {
          if (Array.isArray(node.parameters)) {
            node.parameters.forEach(() => instance.parametersStack.pop());
          } else if (typeof node.parameters === 'object') {
            Object.keys(node.parameters).forEach(() => instance.parametersStack.pop());
          }
        }
      },
    };
  }
}

module.exports = UniqueParameterNames;
