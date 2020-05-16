class PathKeysNoTrailingSlash {
  static get rule() {
    return 'path-keys-no-trailing-slash';
  }

  OpenAPIPath(node, _, ctx) {
    const pathLen = ctx.path.length;
    if (pathLen !== 0 && ctx.path[pathLen - 1][ctx.path[pathLen - 1].length] === '/') {
      ctx.report({
        message: 'Trailing slashes in path are not recommended.',
        reportOnKey: true,
      });
    }
  }
}


module.exports = PathKeysNoTrailingSlash;
