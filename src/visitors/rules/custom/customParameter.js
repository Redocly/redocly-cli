/* eslint-disable class-methods-use-this */

class parameterAllOf {
  constructor(config) {
    this.config = { ...config };
    switch (this.config.level) {
      case 'warning':
        this.config.level = 3;
        break;
      case 'error':
      default:
        this.config.level = 4;
        break;
    }
  }

  get rule() {
    return 'parameterAllOf';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _, ctx, unresolved, traverseTools) => {
        const { traverseNode, visited, resolveType } = traverseTools;
        if (Object.keys(node).indexOf('allOf') !== -1) {
          const allOfVals = node.allOf;
          ctx.path.push('allOf');
          for (let i = 0; i < allOfVals.length; i++) {
            // eslint-disable-next-line no-continue
            if (allOfVals[i].description) continue;
            ctx.path.push(i);
            traverseNode(allOfVals[i], resolveType('OpenAPIParameter'), ctx, visited, true);
            ctx.path.pop();
          }
          ctx.path.pop();
        }
      },
    };
  }
}

module.exports = parameterAllOf;
