import { getClosestString } from '../../../utils';

class NoExtraFields {
  static get rule() {
    return 'no-extra-fields';
  }

  enter(node, definition, ctx) {
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

    if (allowedChildren.length > 0 && typeof node !== 'object') {
      ctx.report(ctx.messageHelpers.fieldTypeMismatchMessageHelper(definition.name));
      return errors;
    }

    Object.keys(node).forEach((field) => {
      ctx.path.push(field);

      if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0 && field !== '$ref') {
        const possibleAlternate = getClosestString(field, allowedChildren);
        ctx.report(
          ctx.messageHelpers.fieldNotAllowedMessageHelper(field, definition.name), {
            reportOnKey: true,
            possibleAlternate,
          },
        );
      }

      ctx.path.pop();
    });
    return errors;
  }
}

module.exports = NoExtraFields;
