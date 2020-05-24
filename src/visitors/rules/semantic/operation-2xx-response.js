class Operation2xxResponse {
  static get rule() {
    return 'operation-2xx-response';
  }

  OpenAPIResponseMap() {
    return {
      onExit: (node, _, ctx) => {
        if (ctx.definitionStack[ctx.definitionStack.length - 1].name !== 'OpenAPIOperation') {
          return [];
        }
        const codes = Object.keys(node);
        if (!codes.find((code) => code[0] === '2' || code === 'default')) {
          return [ctx.createError('Operation must have at least one 2xx response.', 'value')];
        }
        return [];
      },
    };
  }
}

module.exports = Operation2xxResponse;
