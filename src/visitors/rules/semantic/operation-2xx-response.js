class Operation2xxResponse {
  static get rule() {
    return 'operation-2xx-response';
  }

  constructor(config) {
    this.config = config;
    this.responseCodes = [];
  }

  OpenAPIOperation_exit(node, definition, ctx) {
    if (!this.responseCodes.find((code) => code[0] === '2')) {
      ctx.report({
        message: 'Operation must have at least one 2xx response.',
        reportOnKey: true,
      });
    }
    this.responseCodes = [];
  }

  OpenAPIResponseMap(node) {
    this.responseCodes.push(...Object.keys(node));
  }
}

module.exports = Operation2xxResponse;
