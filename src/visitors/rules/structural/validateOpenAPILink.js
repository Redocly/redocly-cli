/* eslint-disable class-methods-use-this */
import { createErrorMutuallyExclusiveFields, createErrrorFieldTypeMismatch } from '../../../error';

import isRuleEnabled from '../../utils';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPILink extends AbstractVisitor {
  static get ruleName() {
    return 'link';
  }

  validators() {
    return {
      operationRef: (node, ctx) => {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationRef', 'operationId'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.operationRef !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      operationId: (node, ctx) => {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationId', 'operationRef'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.operationId !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      parameters: (node, ctx) => {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return createErrrorFieldTypeMismatch('Map[string, any]', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description: (node, ctx) => {
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
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            ctx.path.push(vals[i]);
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
            ctx.path.pop();
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPILink;
