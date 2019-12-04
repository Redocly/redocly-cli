/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../../../error';

import { isUrl } from '../../../utils';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIExternalDocumentation extends AbstractVisitor {
  static get ruleName() {
    return 'external-docs';
  }

  get validators() {
    return {
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      url(node, ctx) {
        if (node && !node.url) return createErrorMissingRequiredField('url', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (!isUrl(node.url)) return createError('url must be a valid URL', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIExternalDocumentation() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIExternalDocumentation;
