import { messageLevels } from '../../error/default';

class AbstractRule {
  constructor(config) {
    this.config = { ...config };
    switch (this.config.level) {
      case 'error':
        this.config.level = messageLevels.ERROR;
        break;
      case 'warning':
        this.config.level = messageLevels.WARNING;
        break;
      case 'info':
        this.config.level = messageLevels.INFO;
        break;
      case 'debug':
        this.config.level = messageLevels.DEBUG;
        break;
      default:
        this.config.level = messageLevels.ERROR;
        break;
    }
  }
}

export default AbstractRule;
