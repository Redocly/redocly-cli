import { getClosestString } from '../../../utils';

class SuggestPossibleRefs {
  static get rule() {
    return 'suggest-possible-refs';
  }

  OpenAPIRoot_exit(node, definition, ctx) {
    for (let i = 0; i < ctx.result.length; i++) {
      if (ctx.result[i].fromRule === 'resolve-ref') {
        ctx.result[i].possibleAlternate = getClosestString(
          ctx.result[i].value.$ref,
          ctx.visited.map((el) => `#/${el.split('::').pop()}`),
        );
      }
    }
  }
}

module.exports = SuggestPossibleRefs;
