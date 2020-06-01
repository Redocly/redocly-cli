class Operation2xxResponse {
  static get rule() {
    return 'operation-2xx-response';
  }

  OpenAPIResponseMap() {
    return {
      onExit: (node, _, ctx) => {
        if (ctx.definitionStack.find((definition) => definition.name === 'OpenAPICallback')) {
          return [];
        }
        const codes = Object.keys(node);
        if (!codes.find((code) => code[0] === '2' || code === 'default')) {
          return [ctx.createError('Operation must have at least one 2xx response.', 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = Operation2xxResponse;
