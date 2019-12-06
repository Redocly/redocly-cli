class ServerNotExample {
  static get rule() {
    return 'server-not-example';
  }

  OpenAPIServer() {
    return {
      onEnter: (node, _, ctx) => {
        if (node.url === 'example.com') {
          return [ctx.createError('The "server" object should not point to "example.com" domain.', 'key')];
        }
        return [];
      },
    };
  }
}

module.exports = ServerNotExample;
