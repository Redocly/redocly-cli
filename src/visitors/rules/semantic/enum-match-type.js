import { matchesJsonSchemaType } from '../../../utils';

class EnumMatchType {
  static get rule() {
    return 'enum-match-type';
  }

  OpenAPISchema(node, _definition, ctx) {
    return this.validate(node, ctx);
  }

  OAS2Schema(node, _definition, ctx) {
    return this.validate(node, ctx);
  }

  validate(node, ctx) {
    const errors = [];
    if (!node.enum || !Array.isArray(node.enum)) {
      return [];
    }
    if (node.type && typeof node.type === 'string') {
      const typeMimsatch = node.enum.filter((item) => !matchesJsonSchemaType(item, node.type));
      typeMimsatch.forEach((val) => {
        ctx.path.push(node.enum.indexOf(val));
        errors.push(ctx.createError(
          'All values of "enum" field must be of the same type as the "type" field.',
          'value',
        ));
        ctx.path.pop();
      });
    }
    return errors;
  }
}

module.exports = EnumMatchType;
