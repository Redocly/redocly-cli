/* eslint-disable class-methods-use-this */
import AbstractVisitor from './utils/AbstractVisitor';

class DebugInfo extends AbstractVisitor {
  constructor() {
    super();
    this.count = 0;
  }

  static get ruleName() {
    return 'debugInfo';
  }

  get rule() {
    return 'debug-info';
  }

  any() {
    return {
      onEnter: () => {
        this.count += 1;
        if (this.count % 1000 === 0) console.log('Processed:', this.count);
      },
    };
  }

  OpenAPIRoot() {
    return {
      onEnter: (node, def, ctx) => {
        console.log(ctx.config);
      },
      onExit: () => {
        console.log(this.count);
        // console.log(ctx.result.length);
        // console.log(ctx.result);
      },
    };
  }
}

module.exports = DebugInfo;
