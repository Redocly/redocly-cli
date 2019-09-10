const Rule = require('./../rules/generic');

class MustHaveAnInfoSection extends Rule {
    _path = 'paths/.+/responses$';

    validate(node, context) {
        console.log(Object.keys(node));
        console.log(Object.keys(node).filter(r => r.match(new RegExp('2\d\d'))));
        if (Object.keys(node).filter(r => r.match(new RegExp('2\d\d'))).length === 0) return this.createError('At least one 2xx responses must be present in get request definition', context.currentPath);
    }
}

module.exports = MustHaveAnInfoSection;