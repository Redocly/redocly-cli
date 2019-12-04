/* eslint-disable class-methods-use-this */
import { createErrorMutuallyExclusiveFields, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPILink extends AbstractVisitor {
  static get ruleName() {
    return 'link';
  }

  get validators() {
    return {
      operationRef(node, ctx) {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationRef', 'operationId'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.operationRef !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      operationId(node, ctx) {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationId', 'operationRef'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.operationId !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return createErrrorFieldTypeMismatch('Map[string, any]', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description(node, ctx) {
        if (!node || !node.description) return null;
        if (typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPILink() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPILink;
