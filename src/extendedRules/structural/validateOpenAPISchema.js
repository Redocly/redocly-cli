/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch } from '../../error';

import { matchesJsonSchemaType, getClosestString } from '../../utils';
import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPISchema extends AbstractRule {
  static get ruleName() {
    return 'schema';
  }

  validators() {
    return {
      title: (node, ctx) => {
        if (node && node.title) {
          if (!(typeof node.title === 'string')) return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      multipleOf: (node, ctx) => {
        if (node && node.multipleOf) {
          if (typeof node.multipleOf !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.multipleOf < 0) return createError('Value of multipleOf must be greater or equal to zero', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      maximum: (node, ctx) => {
        if (node && node.maximum && typeof node.maximum !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      exclusiveMaximum: (node, ctx) => {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      minimum: (node, ctx) => {
        if (node && node.minimum && typeof node.minimum !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      exclusiveMinimum: (node, ctx) => {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      maxLength: (node, ctx) => {
        if (node && node.maxLength) {
          if (typeof node.maxLength !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.maxLength < 0) return createError('Value of maxLength must be greater or equal to zero.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      minLength: (node, ctx) => {
        if (node && node.minLength) {
          if (typeof node.minLength !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.minLength < 0) return createError('Value of minLength must be greater or equal to zero.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      pattern: (node, ctx) => {
        if (node && node.pattern) {
          // TODO: add regexp validation.
          if (typeof node.pattern !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      maxItems: (node, ctx) => {
        if (node && node.maxItems) {
          if (typeof node.maxItems !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.maxItems < 0) return createError('Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      minItems: (node, ctx) => {
        if (node && node.minItems) {
          if (typeof node.minItems !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.minItems < 0) return createError('Value of minItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      uniqueItems: (node, ctx) => {
        if (node && node.uniqueItems) {
          if (typeof node.uniqueItems !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      maxProperties: (node, ctx) => {
        if (node && node.maxProperties) {
          if (typeof node.maxProperties !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.maxProperties < 0) return createError('Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      minProperties: (node, ctx) => {
        if (node && node.minProperties) {
          if (typeof node.minProperties !== 'number') return createErrrorFieldTypeMismatch('number', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.minProperties < 0) return createError('Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      required: (node, ctx) => {
        if (node && node.required) {
          if (!Array.isArray(node.required)) return createErrrorFieldTypeMismatch('array', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
          if (node.required.filter((item) => typeof item !== 'string').length !== 0) return createError('All values of "required" field must be strings', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      enum: (node, ctx) => {
        const errors = [];

        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return [createErrrorFieldTypeMismatch('array', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level })];
          if (node.type && typeof node.type === 'string') {
            const typeMimsatch = node.enum.filter(
              (item) => !matchesJsonSchemaType(item, node.type),
            );

            typeMimsatch.forEach((val) => {
              ctx.path.push(node.enum.indexOf(val));
              errors.push(createError('All values of "enum" field must be of the same type as the "type" field.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level }));
              ctx.path.pop();
            });
          }
        }
        return errors;
      },
      type: (node, ctx) => {
        const errors = [];
        if (node.type && !['string', 'object', 'array', 'integer', 'number', 'boolean'].includes(node.type)) {
          const possibleAlternate = getClosestString(node.type, ['string', 'object', 'array', 'integer', 'number', 'boolean']);
          errors.push(createError('Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean".', node, ctx, {
            fromRule: this.rule, target: 'value', severity: this.config.level, possibleAlternate,
          }));
        }
        return errors;
      },
      items: (node, ctx) => {
        if (node && node.items && Array.isArray(node.items)) return createError('Value of items must not be an array. It must be a Schema object', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      additionalProperties: () => null,
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      format: (node, ctx) => {
        if (node && node.format && typeof node.format !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      nullable: (node, ctx) => {
        if (node && node.nullable && typeof node.nullable !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      readOnly: (node, ctx) => {
        if (node && node.readOnly && typeof node.readOnly !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      writeOnly: (node, ctx) => {
        if (node && node.writeOnly && typeof node.writeOnly !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      deprecated: (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPISchema() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            if (Object.keys(node).indexOf(vals[i]) !== -1) ctx.path.push(vals[i]);
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
            if (Object.keys(node).indexOf(vals[i]) !== -1) ctx.path.pop();
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPISchema;
