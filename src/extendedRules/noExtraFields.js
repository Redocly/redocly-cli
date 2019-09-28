import { createErrorFieldNotAllowed } from '../error';

class NoExtraFields {
  static get ruleName() {
    return 'noExtraFields';
  }

  constructor(config) {
    this.config = config;
  }

  any() {
    return {
      onEnter: (node, definition, ctx) => {
        const errors = [];
        const allowedChildren = [];

        if (definition.properties) {
          switch (typeof definition.properties) {
            case 'object':
              allowedChildren.push(...Object.keys(definition.properties));
              break;
            case 'function':
              allowedChildren.push(...Object.keys(definition.properties(node)));
              break;
            default:
                // do-nothing
          }
        }
        if (definition.allowedFields) allowedChildren.push(...definition.allowedFields);

        Object.keys(node).forEach((field) => {
          ctx.path.push(field);

          if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0 && field !== '$ref') {
            errors.push(createErrorFieldNotAllowed(field, node, ctx));
          }

          ctx.path.pop();
        });
        return errors;
      },
    };
  }
}

module.exports = NoExtraFields;
