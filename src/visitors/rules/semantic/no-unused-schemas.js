class NoUnusedComponents {
  constructor(config) {
    this.config = config;
    this.components = {};
  }

  static get rule() {
    return 'no-unused-schemas';
  }

  OpenAPIRoot_exit(node, definition, ctx) {
    const messages = [];
    ctx.path.push('components');
    ctx.path.push('schemas');
    Object.keys(this.components)
      .filter((schemaName) => this.components[schemaName] === false)
      .forEach((schemaName) => {
        ctx.path.push(schemaName);
        messages.push(ctx.createError(`The schema "${schemaName}" is never used.`, 'key'));
        ctx.path.pop();
      });
    ctx.path.pop();
    ctx.path.pop();
    return messages;
  }

  OpenAPISchema(node, definition, ctx, unresolvedNode) {
    if (unresolvedNode.$ref && unresolvedNode.$ref.indexOf('#/components/schemas') === 0) {
      const schemaName = unresolvedNode.$ref.split('/')[3];
      if (Object.keys(this.components).indexOf(schemaName) !== -1) {
        this.components[schemaName] = true;
      } else {
        this.components[schemaName] = true;
      }
    }
  }

  OpenAPISchemaMap(node, definition, ctx) {
    if (ctx.path[0] === 'components'
     && ctx.path.length === 2 && ctx.pathStack.length === 0) { // in the components.schemas definition
      Object.keys(node).forEach((schemaName) => {
        if (Object.keys(this.components).indexOf(schemaName) !== -1 || node[schemaName].allOf) {
          // .allOf here is used as a very naive check for possible discriminator in parent node
          this.components[schemaName] = true;
        } else {
          this.components[schemaName] = false;
        }
      });
    }
  }
}

module.exports = NoUnusedComponents;
