/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

// this method uses regexps, so is very sloooow,
// for now we are just checking if there are any '_'
// not in the beginning of the name
const validateNodeRegexp = (node, ctx, name) => {
  const errors = [];
  const names = Object.keys(node);
  for (let i = 0; i < names.length; i++) {
    const matches = names[i].match(this.pattern);
    if (!matches || matches.filter((e) => typeof e === 'string').indexOf(names[i]) === -1) {
      ctx.path.push(names[i]);
      const error = createError(`${name} names should be in camelCase.`, node, ctx, { severity: this.config.level, target: 'key', fromRule: this.rule });
      errors.push(error);
      ctx.path.pop();
    }
  }
  return errors;
};

const validateNode = (node, ctx, name, rule) => {
  const errors = [];
  const names = Object.keys(node);
  for (let i = 0; i < names.length; i++) {
    if (names[i].indexOf('_') > 0) {
      ctx.path.push(names[i]);
      const error = createError(`${name}s names should be in camelCase.`, node, ctx, { severity: rule.config.level, target: 'key', fromRule: rule.rule });
      errors.push(error);
      ctx.path.pop();
    }
  }
  return errors;
};

class CamelCaseNames extends AbstractVisitor {
  static get ruleName() {
    return 'camel-case-names';
  }

  constructor(config) {
    super(config);
    this.pattern = new RegExp('^_?[a-zA-Z](([^_]*[a-zA-Z]*)*)');
  }

  get rule() {
    return 'camel-case-names';
  }

  OpenAPISchemaMap() {
    return {
      onEnter: (node, _, ctx) => validateNode(node, ctx, 'Schema', this),
    };
  }

  OpenAPIParameterMap() {
    return {
      onEnter: (node, _, ctx) => validateNode(node, ctx, 'Parameter', this),
    };
  }
}

module.exports = CamelCaseNames;
