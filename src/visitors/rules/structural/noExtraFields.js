import { getClosestString } from '../../../utils';

class NoExtraFields {
  static get rule() {
    return 'no-extra-fields';
  }

  enter(node, definition, ctx) {
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

    if (allowedChildren.length > 0 && typeof node !== 'object') {
      return ctx.report({
        message: ctx.messageHelpers.fieldTypeMismatchMessageHelper(definition.name),
      });
    }

    Object.keys(node).forEach((field) => {
      ctx.path.push(field);

      if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0 && field !== '$ref') {
        const possibleAlternate = getClosestString(field, allowedChildren);
        ctx.report({
          message: ctx.messageHelpers.fieldNotAllowedMessageHelper(field, definition.name),
          reportOnKey: true,
          possibleAlternate,
        });
      }

      ctx.path.pop();
    });

    return null;
  }
}

module.exports = NoExtraFields;
