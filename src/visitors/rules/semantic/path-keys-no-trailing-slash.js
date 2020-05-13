class PathKeysNoTrailingSlash {
  static get rule() {
    return 'path-keys-no-trailing-slash';
  }

  OpenAPIPath(node, _, ctx) {
    const pathLen = ctx.path.length;
    return pathLen === 0 || ctx.path[pathLen - 1][ctx.path[pathLen - 1].length] !== '/'
      ? null
      : [ctx.createError(
        'Trailing spaces in path are not recommended.', 'key',
      )];
  }
}

module.exports = PathKeysNoTrailingSlash;
