class ServersNoTrailingSlash {
  static get rule() {
    return 'servers-no-trailing-slash';
  }

  OpenAPIServer() {
    return {
      onEnter: (node, _, ctx) => (node.url && node.url === '/'
        ? [ctx.createError(
          'Trailing spaces in path are not recommended.', 'key',
        )]
        : null),
    };
  }
}

module.exports = ServersNoTrailingSlash;
