/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../error';

import isRuleEnabled from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPISecuritySchema extends AbstractRule {
  static get ruleName() {
    return 'secuirty-schema';
  }

  validators() {
    return {
      type: (node, ctx) => {
        if (!node.type) return createErrorMissingRequiredField('type', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.type !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) return createError('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      description: (node, ctx) => {
        if (node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      name: (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      in: (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return createErrorMissingRequiredField('in', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.in !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (!['query', 'header', 'cookie'].includes(node.in)) return createError('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      scheme: (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.scheme) return createErrorMissingRequiredField('scheme', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.scheme !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      bearerFormat: (node, ctx) => {
        if (node.bearerFormat && node.type !== 'http') return createError('The bearerFormat field is applicable only for http', node, ctx, { fromRule: this.rule, target: 'key', severity: this.config.level });
        if (!node.bearerFormat && node.type === 'http') return createErrorMissingRequiredField('bearerFormat', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      flows: (node, ctx) => {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return createErrorMissingRequiredField('flows', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      openIdConnectUrl: (node, ctx) => {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) return createErrorMissingRequiredField('openIdConnectUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.openIdConnectUrl !== 'string') return createErrrorFieldTypeMismatch('openIdConnectUrl', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPISecuritySchema() {
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

module.exports = ValidateOpenAPISecuritySchema;
