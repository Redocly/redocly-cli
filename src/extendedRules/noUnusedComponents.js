import createError from '../error';
import AbstractRule from './utils/AbstractRule';

class NoUnusedComponents extends AbstractRule {
  constructor(config) {
    super(config);
    this.components = {};
  }

  static get ruleName() {
    return 'noUnusedComponents';
  }

  OpenAPIRoot() {
    return {
      onExit: (node, definition, ctx) => {
        const messages = [];
        ctx.path.push('components');
        ctx.path.push('schemas');
        Object.keys(this.components)
          .filter((schemaName) => this.components[schemaName] === false)
          .forEach((schemaName) => {
            ctx.path.push(schemaName);
            messages.push(createError(`The schema "${schemaName}" is never used.`, node, ctx, { fromRule: this.rule, target: 'key', severity: this.config.level }));
            ctx.path.pop();
          });
        ctx.path.pop();
        ctx.path.pop();
        return messages;
      },
    };
  }

  OpenAPISchema() {
    return {
      onEnter: (node, definition, ctx, unresolvedNode) => {
        if (unresolvedNode.$ref && unresolvedNode.$ref.indexOf('#/components/schemas') === 0) {
          const schemaName = unresolvedNode.$ref.split('/')[3];
          if (Object.keys(this.components).indexOf(schemaName) !== -1) {
            this.components[schemaName] = true;
          } else {
            this.components[schemaName] = true;
          }
        }
      },
    };
  }

  OpenAPISchemaMap() {
    return {
      onEnter: (node, definition, ctx) => {
        if (ctx.path[0] === 'components' && ctx.path.length === 2 && ctx.pathStack.length === 0) { // in the components.schemas definition
          Object.keys(node).forEach((schemaName) => {
            // console.log(schemaName);
            if (Object.keys(this.components).indexOf(schemaName) !== -1 || node[schemaName].allOf) {
              // .allOf here is used as a very naive check for possible discriminator in parent node
              this.components[schemaName] = true;
            } else {
              this.components[schemaName] = false;
            }
          });
        }
      },
    };
  }
}

module.exports = NoUnusedComponents;
