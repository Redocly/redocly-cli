import fs from 'fs';
import AbstractRule from '../utils/AbstractRule';

import createError from '../../error';

class NoRefSiblings extends AbstractRule {
  static get ruleName() {
    return 'no-$ref-siblings';
  }

  any() {
    return {
      onEnter: (node, definition, ctx, unresolvedNode) => {
        const errors = [];

        if (!unresolvedNode || typeof unresolvedNode !== 'object') return errors;

        const nodeKeys = Object.keys(unresolvedNode);
        if (nodeKeys.indexOf('$ref') === -1) return errors;

        if (nodeKeys.length > 1) {
          const tempPath = {
            path: ctx.path,
            filePath: ctx.filePath,
            source: ctx.source,
          };

          const prevPathItem = ctx.pathStack[ctx.pathStack.length - 1];

          ctx.path = prevPathItem.path;
          ctx.filePath = prevPathItem.file;
          ctx.source = fs.readFileSync(prevPathItem.file, 'utf-8');

          for (let i = 0; i < nodeKeys.length; i++) {
            if (nodeKeys[i] !== '$ref') {
              ctx.path.push(nodeKeys[i]);
              const e = createError(
                'No siblings are allowed inside object with $ref property.',
                unresolvedNode,
                ctx,
                {
                  severity: this.config.level, fromRule: this.rule, taget: 'key',
                },
              );
              errors.push(e);
              ctx.path.pop();
            }
          }

          ctx.source = tempPath.source;
          ctx.path = tempPath.path;
          ctx.filePath = tempPath.filePath;
        }

        return errors;
      },
    };
  }
}

module.exports = NoRefSiblings;
