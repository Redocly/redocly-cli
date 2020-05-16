import OpenAPIOperation from '../../../types/OAS3/OpenAPIOperation';
import OpenAPIPath from '../../../types/OAS3/OpenAPIPath';

class UniqueParameterNames {
  static get rule() {
    return 'unique-parameter-names';
  }

  constructor(config) {
    this.config = config;
    this.currentOperationParameters = [];
    this.currentPathParameters = [];
  }

  OpenAPIComponents_exit() {
    this.currentOperationParameters = [];
    this.currentPathParameters = [];
  }

  OpenAPIOperation_exit() {
    this.currentOperationParameters = [];
  }

  OpenAPIPath_exit() {
    this.currentPathParameters = [];
  }

  OpenAPIParameter(node, _, ctx) {
    let paramsList = [];

    if (ctx.definitionStack.includes(OpenAPIOperation)) {
      paramsList = this.currentOperationParameters;
    } else if (ctx.definitionStack.includes(OpenAPIPath)) {
      paramsList = this.currentPathParameters;
    } else {
      return;
    }

    if (node.name && paramsList.includes(node.name)) {
      ctx.path.push('name');
      ctx.report({
        message: 'Duplicate parameters are not allowed. This name is already used on this level.',
      });
      ctx.path.pop();
    }
    if (node.name) {
      paramsList.push(node.name);
    }
  }
}

module.exports = UniqueParameterNames;
