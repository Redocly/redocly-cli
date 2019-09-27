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

  exitNode(node) {
    if (node.parameters) {
      if (Array.isArray(node.parameters)) {
        node.parameters.forEach(() => this.parametersStack.pop());
      } else if (typeof node.parameters === 'object') {
        Object.keys(node.parameters).forEach(() => this.parametersStack.pop());
      }
    }
  }

  OpenAPIComponents() {
    return {
      onExit: this.exitNode.bind(this),
    };
  }

  OpenAPIOperation() {
    return {
      onExit: this.exitNode.bind(this),
    };
  }

  OpenAPIPath() {
    return {
      onExit: this.exitNode.bind(this),
    };
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, definition, ctx) => {
        let error;
        if (this.parametersStack.includes(node.name)) {
          ctx.path.push('name');
          error = createError('Duplicate parameters are not allowed. This name already used on higher or same level.', node, ctx);
          ctx.path.pop();
        }
        this.parametersStack.push(node.name);
        return error ? [error] : [];
      },
    };
  }
}

module.exports = UniqueParameterNames;
