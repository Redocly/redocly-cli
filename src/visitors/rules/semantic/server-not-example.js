class ServerNotExample {
  static get rule() {
    return 'server-not-example';
  }

  OpenAPIServer(node, _, ctx) {
    if (node.url === 'example.com') {
      ctx.report({
        message: 'The "server" object should not point to "example.com" domain.',
        reportOnKey: true,
      });
    }
  }
}

module.exports = ServerNotExample;
