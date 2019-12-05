class DebugInfo {
  constructor(config) {
    this.config = config;
    this.count = 0;
  }

  static get rule() {
    return 'debug-info';
  }

  any() {
    return {
      onEnter: () => {
        this.count += 1;
        if (this.count % 1000 === 0) process.stdout.write(`Processed: ${this.count}\n`);
      },
    };
  }

  OpenAPIRoot() {
    return {
      onEnter: (node, def, ctx) => {
        process.stdout.write(`${ctx.config}\n`);
      },
      onExit: () => {
        process.stdout.write(`${this.count}`);
      },
    };
  }
}

module.exports = DebugInfo;
