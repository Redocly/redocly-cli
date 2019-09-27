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


  onEnter(node, definition, ctx) {
    let error;
    if (definition.name === 'OpenAPIParameter') {
      if (this.parametersStack.includes(node.name)) {
        ctx.path.push('name');
        console.log(this.msg);
        error = createError('Duplicate parameters are not allowed. This name already used on higher level.', node, ctx);
        ctx.path.pop();
      }
      this.parametersStack.push(node.name);
    }
    return error ? [error] : [];
  }

  onExit(node) {
    if (node.parameters) {
      if (Array.isArray(node.parameters)) {
        node.parameters.forEach(() => this.parametersStack.pop());
      } else if (typeof node.parameters === 'object') {
        Object.keys(node.parameters).forEach(() => this.parametersStack.pop());
      }
    }
  }
}

module.exports = UniqueParameterNames;
