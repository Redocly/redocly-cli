import createError from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class UniqueParameterNames extends AbstractVisitor {
  static get ruleName() {
    return 'uniqueParameterNames';
  }

  get rule() {
    return 'unique-parameter-names';
  }

  constructor(config) {
    super(config);
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
        if (this.parametersStack.includes(node.name) && !(ctx.pathStack.length === 0 && ctx.path.includes('components'))) {
          ctx.path.push('name');
          error = createError('Duplicate parameters are not allowed. This name already used on higher or same level.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          ctx.path.pop();
        }
        this.parametersStack.push(node.name);
        return error ? [error] : [];
      },
    };
  }
}

module.exports = UniqueParameterNames;
