/* eslint-disable no-continue */
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

  static get rule() {
    return 'parameterAllOfas';
  }
}

module.exports = parameterAllOf;
