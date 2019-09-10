const Rule = require('./../rules/generic');

class MustHaveAnInfoSection extends Rule {
    _path = '#/info$';

    validate(node, context) {
        if (!('version' in Object.keys(node))) return this.createError('Info section must include "version" field', context.currentPath);
    }
}

module.exports = MustHaveAnInfoSection;