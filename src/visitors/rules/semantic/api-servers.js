class ApiServers {
  static get rule() {
    return 'api-servers';
  }

  OpenAPIRoot(node, _, ctx) {
    return (node.servers && Array.isArray(node.servers) && node.servers.length > 0)
      ? null
      : [
        ctx.createError(ctx.messageHelpers.missingRequiredField('servers'), 'key'),
      ];
  }
}

module.exports = ApiServers;
