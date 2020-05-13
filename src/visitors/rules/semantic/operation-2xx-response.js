class Operation2xxResponse {
  static get rule() {
    return 'operation-2xx-response';
  }

  constructor(config) {
    this.config = config;
    this.responseCodes = [];
  }

  OpenAPIOperation_exit(node, definition, ctx) {
    const errors = [];
    if (!this.responseCodes.find((code) => code[0] === '2')) {
      errors.push(ctx.createError('Operation must have at least one 2xx response.', 'key'));
    }
    this.responseCodes = [];
    return errors;
  }

  OpenAPIResponseMap(node) {
    this.responseCodes.push(...Object.keys(node));
  }
}

module.exports = Operation2xxResponse;
