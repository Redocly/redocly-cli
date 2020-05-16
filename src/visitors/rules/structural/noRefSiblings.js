import { MAPPING_DATA_KEY } from '../../../types/OAS3/OpenAPIDiscriminator';

class NoRefSiblings {
  static get rule() {
    return 'no-$ref-siblings';
  }

  enter(node, definition, ctx, unresolvedNode) {
    if (!unresolvedNode || typeof unresolvedNode !== 'object') return;

    const nodeKeys = Object.keys(unresolvedNode);
    if (nodeKeys.indexOf('$ref') === -1) return;

    if (nodeKeys.length > 1) {
      const tempPath = {
        path: ctx.path,
        filePath: ctx.filePath,
        source: ctx.source,
      };

      const prevPathItem = ctx.pathStack[ctx.pathStack.length - 1];

      ctx.path = prevPathItem.path;
      ctx.filePath = prevPathItem.file;
      ctx.source = prevPathItem.source;

      for (let i = 0; i < nodeKeys.length; i++) {
        if (nodeKeys[i] !== '$ref' && nodeKeys[i] !== MAPPING_DATA_KEY) {
          ctx.path.push(nodeKeys[i]);
          ctx.report({
            message: 'No siblings are allowed inside object with $ref property.',
            reportOnKey: true,
          });
          ctx.path.pop();
        }
      }

      ctx.source = tempPath.source;
      ctx.path = tempPath.path;
      ctx.filePath = tempPath.filePath;
    }
  }
}

module.exports = NoRefSiblings;
