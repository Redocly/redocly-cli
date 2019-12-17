/* eslint-disable max-classes-per-file */
const fs = require('fs');
const path = require('path');

class OverlaysMerger {
  static get rule() {
    return 'writeCheck';
  }

  any() {
    return {
      onEnter: (node, type, ctx) => {
        if (node['x-redocly-overlay']) {
          const definitionDir = path.dirname(ctx.filePath);
          const overlayPath = path.resolve(definitionDir, node['x-redocly-overlay'].path);

          if (fs.existsSync(overlayPath)) {
            const patch = JSON.parse(fs.readFileSync(overlayPath));

            Object.keys(patch).forEach((k) => {
              node[k] = patch[k];
            });

            delete node['x-redocly-overlay'];
          }
        }
      },
    };
  }
}

class MergeChecker {
  static get rule() {
    return 'mergerCheck';
  }

  OpenAPIInfo() {
    return {
      onEnter: (node, type, ctx) => {
        console.log(node);
      },
    };
  }
}

module.exports = [
  OverlaysMerger, MergeChecker,
];
