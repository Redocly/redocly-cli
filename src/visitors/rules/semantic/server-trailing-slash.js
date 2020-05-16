class ServersNoTrailingSlash {
  static get rule() {
    return 'servers-no-trailing-slash';
  }

  OpenAPIServer(node, _, ctx) {
    if (node.url && node.url === '/') {
      ctx.report({
        message: 'Trailing spaces in path are not recommended.',
        reportOnKey: true,
      });
    }
  }
}

module.exports = ServersNoTrailingSlash;
