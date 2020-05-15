/* eslint-disable max-classes-per-file */
const fs = require('fs');
const path = require('path');

class OverlaysMerger {
  static get rule() {
    return 'writeCheck';
  }

  enter(node, type, ctx) {
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
  }
}

class MergeChecker {
  static get rule() {
    return 'mergerCheck';
  }

  OpenAPIRoot_enter() {
    console.log('root');
  }

  OpenAPIRoot_exit() {
    console.log('root exit');
  }

  OpenAPIInfo(node, definition, ctx) {
    ctx.report({
      message: 'AAA',
      severity: 'ERROR',
      locations: [{
        path: [...ctx.path, 'license'],
        reportOnKey: true,
      }],
      reportOnKey: false,
    });
    console.log('adakdjkasdjkasjdkasjdks');
  }

  OpenAPIInfo_exit(node) {
    console.log(node);
  }
}

module.exports = [
  OverlaysMerger, MergeChecker,
];
