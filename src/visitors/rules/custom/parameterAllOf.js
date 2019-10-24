/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import { OpenAPIParameter } from '../../../types/OpenAPIParameter';

class parameterAllOf extends AbstractVisitor {
  static get ruleName() {
    return 'parameterAllOf';
  }

  get rule() {
    return 'parameterAllOf';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _, ctx, unresolved, traverseNode, visited) => {
        if (Object.keys(node).indexOf('allOf') !== -1) {
          const allOfVals = node.allOf;
          ctx.path.push('allOf');
          for (let i = 0; i < allOfVals.length; i++) {
            if (allOfVals[i].description) continue;
            ctx.path.push(i);
            traverseNode(allOfVals[i], OpenAPIParameter, ctx, visited, true);
            ctx.path.pop();
          }
          ctx.path.pop();
        }
      },
    };
  }
}

module.exports = parameterAllOf;
