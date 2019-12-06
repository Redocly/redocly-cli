class ApiServers {
  static get rule() {
    return 'api-servers';
  }

  OpenAPIRoot() {
    return {
      onEnter: (node, _, ctx) => (
        (node.servers && Array.isArray(node.servers) && node.servers.length > 0)
          ? null
          : [
            ctx.createError(ctx.messageHelpers.missingRequiredField('servers'), 'key'),
          ]),
    };
  }
}

module.exports = ApiServers;
