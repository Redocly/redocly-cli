import AbstractVisitor from '../../utils/AbstractVisitor';
import { getClosestString } from '../../../utils';

class SuggestPossibleRefs extends AbstractVisitor {
  static get ruleName() {
    return 'suggestPossibleRefs';
  }

  get rule() {
    return 'suggest-possible-refs';
  }

  OpenAPIRoot() {
    return {
      onExit: (node, definition, ctx) => {
        for (let i = 0; i < ctx.result.length; i++) {
          if (ctx.result[i].fromRule === 'resolve-ref') {
            const possibleAlternate = getClosestString(ctx.result[i].value.$ref, ctx.visited.map((el) => `#/${el.split('::').pop()}`));
            ctx.result[i].possibleAlternate = possibleAlternate;
          }
        }
      },
    };
  }
}

module.exports = SuggestPossibleRefs;
