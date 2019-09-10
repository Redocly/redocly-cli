const Rule = require('./../rules/generic');

class MustHaveAnInfoSection extends Rule {
    _path = '#$';

    validate(node, context) {
        if (!('info' in Object.keys(node))) return this.createError('Info section must be present in the root of the document', context.currentPath);
    }
}

module.exports = MustHaveAnInfoSection;