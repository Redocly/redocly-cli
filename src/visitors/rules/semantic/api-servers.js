class ApiServers {
  static get rule() {
    return 'api-servers';
  }

  OpenAPIRoot(node, _, ctx) {
    if (!node.servers || !Array.isArray(node.servers) || !node.servers.length > 0) {
      ctx.report({
        message: ctx.messageHelpers.missingRequiredField('servers'),
        reportOnKey: true,
      });
    }
  }
}

module.exports = ApiServers;
