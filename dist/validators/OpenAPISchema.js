"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireWildcard(require("../error"));

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

var _OpenAPISchemaMap = _interopRequireDefault(require("./OpenAPISchemaMap"));

var _OpenAPIDiscriminator = _interopRequireDefault(require("./OpenAPIDiscriminator"));

var _OpenAPIXML = _interopRequireDefault(require("./OpenAPIXML"));

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// @ts-check

/* eslint-disable import/no-cycle */
const OpenAPISchemaObject = {
  validators: {
    title() {
      return (node, ctx) => {
        if (node && node.title) {
          if (!(typeof node.title === 'string')) return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        return null;
      };
    },

    multipleOf() {
      return (node, ctx) => {
        if (node && node.multipleOf) {
          if (typeof node.multipleOf !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.multipleOf < 0) return (0, _error.default)('Value of multipleOf must be greater or equal to zero', node, ctx);
        }

        return null;
      };
    },

    maximum() {
      return (node, ctx) => {
        if (node && node.maximum && typeof node.maximum !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
        return null;
      };
    },

    exclusiveMaximum() {
      return (node, ctx) => {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    minimum() {
      return (node, ctx) => {
        if (node && node.minimum && typeof node.minimum !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
        return null;
      };
    },

    exclusiveMinimum() {
      return (node, ctx) => {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    maxLength() {
      return (node, ctx) => {
        if (node && node.maxLength) {
          if (typeof node.maxLength !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.maxLength < 0) return (0, _error.default)('Value of maxLength must be greater or equal to zero', node, ctx);
        }

        return null;
      };
    },

    minLength() {
      return (node, ctx) => {
        if (node && node.minLength) {
          if (typeof node.minLength !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.minLength < 0) return (0, _error.default)('Value of minLength must be greater or equal to zero', node, ctx);
        }

        return null;
      };
    },

    pattern() {
      return (node, ctx) => {
        if (node && node.pattern) {
          // TODO: add regexp validation.
          if (typeof node.pattern !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        return null;
      };
    },

    maxItems() {
      return (node, ctx) => {
        if (node && node.maxItems) {
          if (typeof node.maxItems !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.maxItems < 0) return (0, _error.default)('Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }

        return null;
      };
    },

    minItems() {
      return (node, ctx) => {
        if (node && node.minItems) {
          if (typeof node.minItems !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.minItems < 0) return (0, _error.default)('Value of minItems must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }

        return null;
      };
    },

    uniqueItems() {
      return (node, ctx) => {
        if (node && node.uniqueItems) {
          if (typeof node.uniqueItems !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        }

        return null;
      };
    },

    maxProperties() {
      return (node, ctx) => {
        if (node && node.maxProperties) {
          if (typeof node.maxProperties !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.maxProperties < 0) return (0, _error.default)('Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }

        return null;
      };
    },

    minProperties() {
      return (node, ctx) => {
        if (node && node.minProperties) {
          if (typeof node.minProperties !== 'number') return (0, _error.createErrrorFieldTypeMismatch)('number', node, ctx);
          if (node.minProperties < 0) return (0, _error.default)('Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.', node, ctx);
        }

        return null;
      };
    },

    required() {
      return (node, ctx) => {
        if (node && node.required) {
          if (!Array.isArray(node.required)) return (0, _error.createErrrorFieldTypeMismatch)('array', node, ctx);
          if (node.required.filter(item => typeof item !== 'string').length !== 0) return (0, _error.default)('All values of "required" field must be strings', node, ctx);
        }

        return null;
      };
    },

    enum() {
      return (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return (0, _error.createErrrorFieldTypeMismatch)('array', node, ctx);

          if (node.type && typeof node.type === 'string') {
            const typeMimsatch = node.enum.filter(item => !(0, _utils.matchesJsonSchemaType)(item, node.type));

            if (typeMimsatch.length !== 0) {
              ctx.path.push(node.enum.indexOf(typeMimsatch[0]));
              const error = (0, _error.default)('All values of "enum" field must be of the same type as the "type" field', node, ctx);
              ctx.path.pop();
              return error;
            }
          }
        }

        return null;
      };
    },

    type() {
      return (node, ctx) => {
        if (node.type && !['string', 'object', 'array', 'integer', 'number', 'boolean'].includes(node.type)) {
          return (0, _error.default)('Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean"', node, ctx);
        }

        return null;
      };
    },

    items() {
      return (node, ctx) => {
        if (node && node.items && Array.isArray(node.items)) return (0, _error.default)('Value of items must not be an array. It must be a Schema object', node, ctx);
        return null;
      };
    },

    additionalProperties() {
      return () => null;
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    format() {
      return (node, ctx) => {
        if (node && node.format && typeof node.format !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    nullable() {
      return (node, ctx) => {
        if (node && node.nullable && typeof node.nullable !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    readOnly() {
      return (node, ctx) => {
        if (node && node.readOnly && typeof node.readOnly !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    writeOnly() {
      return (node, ctx) => {
        if (node && node.writeOnly && typeof node.writeOnly !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    example() {
      return () => null;
    },

    default() {
      return () => null;
    },

    allOf() {
      return () => null;
    }

  },
  properties: {
    allOf() {
      return OpenAPISchemaObject;
    },

    anyOf() {
      return OpenAPISchemaObject;
    },

    oneOf() {
      return OpenAPISchemaObject;
    },

    not() {
      return OpenAPISchemaObject;
    },

    items() {
      return OpenAPISchemaObject;
    },

    properties: _OpenAPISchemaMap.default,
    discriminator: _OpenAPIDiscriminator.default,
    externalDocs: _OpenAPIExternalDocumentation.default,
    xml: _OpenAPIXML.default
  }
};
var _default = OpenAPISchemaObject;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTY2hlbWEuanMiXSwibmFtZXMiOlsiT3BlbkFQSVNjaGVtYU9iamVjdCIsInZhbGlkYXRvcnMiLCJ0aXRsZSIsIm5vZGUiLCJjdHgiLCJtdWx0aXBsZU9mIiwibWF4aW11bSIsImV4Y2x1c2l2ZU1heGltdW0iLCJtaW5pbXVtIiwiZXhjbHVzaXZlTWluaW11bSIsIm1heExlbmd0aCIsIm1pbkxlbmd0aCIsInBhdHRlcm4iLCJtYXhJdGVtcyIsIm1pbkl0ZW1zIiwidW5pcXVlSXRlbXMiLCJtYXhQcm9wZXJ0aWVzIiwibWluUHJvcGVydGllcyIsInJlcXVpcmVkIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImxlbmd0aCIsImVudW0iLCJ0eXBlIiwidHlwZU1pbXNhdGNoIiwicGF0aCIsInB1c2giLCJpbmRleE9mIiwiZXJyb3IiLCJwb3AiLCJpbmNsdWRlcyIsIml0ZW1zIiwiYWRkaXRpb25hbFByb3BlcnRpZXMiLCJkZXNjcmlwdGlvbiIsImZvcm1hdCIsIm51bGxhYmxlIiwicmVhZE9ubHkiLCJ3cml0ZU9ubHkiLCJkZXByZWNhdGVkIiwiZXhhbXBsZSIsImRlZmF1bHQiLCJhbGxPZiIsInByb3BlcnRpZXMiLCJhbnlPZiIsIm9uZU9mIiwibm90IiwiT3BlbkFQSVNjaGVtYU1hcCIsImRpc2NyaW1pbmF0b3IiLCJPcGVuQVBJRGlzY3JpbWluYXRvciIsImV4dGVybmFsRG9jcyIsIk9wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24iLCJ4bWwiLCJPcGVuQVBJWE1MIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBRUE7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBUkE7O0FBQ0E7QUFTQSxNQUFNQSxtQkFBbUIsR0FBRztBQUMxQkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLEtBQUssR0FBRztBQUNOLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7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RUFBcUUsT0FBTywwQ0FBOEIsU0FBOUIsRUFBeUNyQyxJQUF6QyxFQUErQ0MsR0FBL0MsQ0FBUDtBQUNyRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FqTVM7O0FBa01WcUMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxNQUFNLElBQWI7QUFDRCxLQXBNUzs7QUFxTVZDLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sTUFBTSxJQUFiO0FBQ0QsS0F2TVM7O0FBd01WQyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPLE1BQU0sSUFBYjtBQUNEOztBQTFNUyxHQURjO0FBNk0xQkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZELElBQUFBLEtBQUssR0FBRztBQUNOLGFBQU8zQyxtQkFBUDtBQUNELEtBSFM7O0FBSVY2QyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPN0MsbUJBQVA7QUFDRCxLQU5TOztBQU9WOEMsSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTzlDLG1CQUFQO0FBQ0QsS0FUUzs7QUFVVitDLElBQUFBLEdBQUcsR0FBRztBQUNKLGFBQU8vQyxtQkFBUDtBQUNELEtBWlM7O0FBYVZpQyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPakMsbUJBQVA7QUFDRCxLQWZTOztBQWdCVjRDLElBQUFBLFVBQVUsRUFBRUkseUJBaEJGO0FBaUJWQyxJQUFBQSxhQUFhLEVBQUVDLDZCQWpCTDtBQWtCVkMsSUFBQUEsWUFBWSxFQUFFQyxxQ0FsQko7QUFtQlZDLElBQUFBLEdBQUcsRUFBRUM7QUFuQks7QUE3TWMsQ0FBNUI7ZUFvT2V0RCxtQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1jaGVja1xuLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWN5Y2xlICovXG5pbXBvcnQgY3JlYXRlRXJyb3IsIHsgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi9lcnJvcic7XG5cbmltcG9ydCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIGZyb20gJy4vT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbic7XG5pbXBvcnQgT3BlbkFQSVNjaGVtYU1hcCBmcm9tICcuL09wZW5BUElTY2hlbWFNYXAnO1xuaW1wb3J0IE9wZW5BUElEaXNjcmltaW5hdG9yIGZyb20gJy4vT3BlbkFQSURpc2NyaW1pbmF0b3InO1xuaW1wb3J0IE9wZW5BUElYTUwgZnJvbSAnLi9PcGVuQVBJWE1MJztcbmltcG9ydCB7IG1hdGNoZXNKc29uU2NoZW1hVHlwZSB9IGZyb20gJy4uL3V0aWxzJztcblxuY29uc3QgT3BlbkFQSVNjaGVtYU9iamVjdCA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHRpdGxlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS50aXRsZSkge1xuICAgICAgICAgIGlmICghKHR5cGVvZiBub2RlLnRpdGxlID09PSAnc3RyaW5nJykpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBtdWx0aXBsZU9mKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tdWx0aXBsZU9mKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBub2RlLm11bHRpcGxlT2YgIT09ICdudW1iZXInKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ251bWJlcicsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgaWYgKG5vZGUubXVsdGlwbGVPZiA8IDApIHJldHVybiBjcmVhdGVFcnJvcignVmFsdWUgb2YgbXVsdGlwbGVPZiBtdXN0IGJlIGdyZWF0ZXIgb3IgZXF1YWwgdG8gemVybycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWF4aW11bSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubWF4aW11bSAmJiB0eXBlb2Ygbm9kZS5tYXhpbXVtICE9PSAnbnVtYmVyJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdudW1iZXInLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleGNsdXNpdmVNYXhpbXVtKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5leGNsdXNpdmVNYXhpbXVtICYmIHR5cGVvZiBub2RlLmV4Y2x1c2l2ZU1heGltdW0gIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWluaW11bSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubWluaW11bSAmJiB0eXBlb2Ygbm9kZS5taW5pbXVtICE9PSAnbnVtYmVyJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdudW1iZXInLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleGNsdXNpdmVNaW5pbXVtKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5leGNsdXNpdmVNaW5pbXVtICYmIHR5cGVvZiBub2RlLmV4Y2x1c2l2ZU1pbmltdW0gIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWF4TGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tYXhMZW5ndGgpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG5vZGUubWF4TGVuZ3RoICE9PSAnbnVtYmVyJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdudW1iZXInLCBub2RlLCBjdHgpO1xuICAgICAgICAgIGlmIChub2RlLm1heExlbmd0aCA8IDApIHJldHVybiBjcmVhdGVFcnJvcignVmFsdWUgb2YgbWF4TGVuZ3RoIG11c3QgYmUgZ3JlYXRlciBvciBlcXVhbCB0byB6ZXJvJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBtaW5MZW5ndGgoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm1pbkxlbmd0aCkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5taW5MZW5ndGggIT09ICdudW1iZXInKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ251bWJlcicsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgaWYgKG5vZGUubWluTGVuZ3RoIDwgMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdWYWx1ZSBvZiBtaW5MZW5ndGggbXVzdCBiZSBncmVhdGVyIG9yIGVxdWFsIHRvIHplcm8nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHBhdHRlcm4oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnBhdHRlcm4pIHtcbiAgICAgICAgICAvLyBUT0RPOiBhZGQgcmVnZXhwIHZhbGlkYXRpb24uXG4gICAgICAgICAgaWYgKHR5cGVvZiBub2RlLnBhdHRlcm4gIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWF4SXRlbXMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm1heEl0ZW1zKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBub2RlLm1heEl0ZW1zICE9PSAnbnVtYmVyJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdudW1iZXInLCBub2RlLCBjdHgpO1xuICAgICAgICAgIGlmIChub2RlLm1heEl0ZW1zIDwgMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdWYWx1ZSBvZiBtYXhJdGVtcyBtdXN0IGJlIGdyZWF0ZXIgb3IgZXF1YWwgdG8gemVyby4gWW91IGNhbmB0IGhhdmUgbmVnYXRpdmUgYW1vdW50IG9mIHNvbWV0aGluZy4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG1pbkl0ZW1zKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5taW5JdGVtcykge1xuICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5taW5JdGVtcyAhPT0gJ251bWJlcicpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnbnVtYmVyJywgbm9kZSwgY3R4KTtcbiAgICAgICAgICBpZiAobm9kZS5taW5JdGVtcyA8IDApIHJldHVybiBjcmVhdGVFcnJvcignVmFsdWUgb2YgbWluSXRlbXMgbXVzdCBiZSBncmVhdGVyIG9yIGVxdWFsIHRvIHplcm8uIFlvdSBjYW5gdCBoYXZlIG5lZ2F0aXZlIGFtb3VudCBvZiBzb21ldGhpbmcuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bmlxdWVJdGVtcygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudW5pcXVlSXRlbXMpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG5vZGUudW5pcXVlSXRlbXMgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBtYXhQcm9wZXJ0aWVzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tYXhQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBub2RlLm1heFByb3BlcnRpZXMgIT09ICdudW1iZXInKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ251bWJlcicsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgaWYgKG5vZGUubWF4UHJvcGVydGllcyA8IDApIHJldHVybiBjcmVhdGVFcnJvcignVmFsdWUgb2YgbWF4UHJvcGVydGllcyBtdXN0IGJlIGdyZWF0ZXIgb3IgZXF1YWwgdG8gemVyby4gWW91IGNhbmB0IGhhdmUgbmVnYXRpdmUgYW1vdW50IG9mIHNvbWV0aGluZy4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG1pblByb3BlcnRpZXMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm1pblByb3BlcnRpZXMpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG5vZGUubWluUHJvcGVydGllcyAhPT0gJ251bWJlcicpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnbnVtYmVyJywgbm9kZSwgY3R4KTtcbiAgICAgICAgICBpZiAobm9kZS5taW5Qcm9wZXJ0aWVzIDwgMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdWYWx1ZSBvZiBtaW5Qcm9wZXJ0aWVzIG11c3QgYmUgZ3JlYXRlciBvciBlcXVhbCB0byB6ZXJvLiBZb3UgY2FuYHQgaGF2ZSBuZWdhdGl2ZSBhbW91bnQgb2Ygc29tZXRoaW5nLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVxdWlyZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnJlcXVpcmVkKSB7XG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG5vZGUucmVxdWlyZWQpKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2FycmF5Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgICBpZiAobm9kZS5yZXF1aXJlZC5maWx0ZXIoKGl0ZW0pID0+IHR5cGVvZiBpdGVtICE9PSAnc3RyaW5nJykubGVuZ3RoICE9PSAwKSByZXR1cm4gY3JlYXRlRXJyb3IoJ0FsbCB2YWx1ZXMgb2YgXCJyZXF1aXJlZFwiIGZpZWxkIG11c3QgYmUgc3RyaW5ncycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZW51bSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZW51bSkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShub2RlLmVudW0pKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2FycmF5Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgICBpZiAobm9kZS50eXBlICYmIHR5cGVvZiBub2RlLnR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlTWltc2F0Y2ggPSBub2RlLmVudW0uZmlsdGVyKFxuICAgICAgICAgICAgICAoaXRlbSkgPT4gIW1hdGNoZXNKc29uU2NoZW1hVHlwZShpdGVtLCBub2RlLnR5cGUpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICh0eXBlTWltc2F0Y2gubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgIGN0eC5wYXRoLnB1c2gobm9kZS5lbnVtLmluZGV4T2YodHlwZU1pbXNhdGNoWzBdKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoJ0FsbCB2YWx1ZXMgb2YgXCJlbnVtXCIgZmllbGQgbXVzdCBiZSBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBcInR5cGVcIiBmaWVsZCcsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgIGN0eC5wYXRoLnBvcCgpO1xuICAgICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHR5cGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICYmICFbJ3N0cmluZycsICdvYmplY3QnLCAnYXJyYXknLCAnaW50ZWdlcicsICdudW1iZXInLCAnYm9vbGVhbiddLmluY2x1ZGVzKG5vZGUudHlwZSkpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ09iamVjdCB0eXBlIGNhbiBiZSBvbmUgb2YgZm9sbG93aW5nIG9ubHk6IFwic3RyaW5nXCIsIFwib2JqZWN0XCIsIFwiYXJyYXlcIiwgXCJpbnRlZ2VyXCIsIFwibnVtYmVyXCIsIFwiYm9vbGVhblwiJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBpdGVtcygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuaXRlbXMgJiYgQXJyYXkuaXNBcnJheShub2RlLml0ZW1zKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdWYWx1ZSBvZiBpdGVtcyBtdXN0IG5vdCBiZSBhbiBhcnJheS4gSXQgbXVzdCBiZSBhIFNjaGVtYSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBhZGRpdGlvbmFsUHJvcGVydGllcygpIHtcbiAgICAgIHJldHVybiAoKSA9PiBudWxsO1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBmb3JtYXQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmZvcm1hdCAmJiB0eXBlb2Ygbm9kZS5mb3JtYXQgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG51bGxhYmxlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5udWxsYWJsZSAmJiB0eXBlb2Ygbm9kZS5udWxsYWJsZSAhPT0gJ2Jvb2xlYW4nKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2Jvb2xlYW4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICByZWFkT25seSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUucmVhZE9ubHkgJiYgdHlwZW9mIG5vZGUucmVhZE9ubHkgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgd3JpdGVPbmx5KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS53cml0ZU9ubHkgJiYgdHlwZW9mIG5vZGUud3JpdGVPbmx5ICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlcHJlY2F0ZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlcHJlY2F0ZWQgJiYgdHlwZW9mIG5vZGUuZGVwcmVjYXRlZCAhPT0gJ2Jvb2xlYW4nKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2Jvb2xlYW4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleGFtcGxlKCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgICBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgICBhbGxPZigpIHtcbiAgICAgIHJldHVybiAoKSA9PiBudWxsO1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBhbGxPZigpIHtcbiAgICAgIHJldHVybiBPcGVuQVBJU2NoZW1hT2JqZWN0O1xuICAgIH0sXG4gICAgYW55T2YoKSB7XG4gICAgICByZXR1cm4gT3BlbkFQSVNjaGVtYU9iamVjdDtcbiAgICB9LFxuICAgIG9uZU9mKCkge1xuICAgICAgcmV0dXJuIE9wZW5BUElTY2hlbWFPYmplY3Q7XG4gICAgfSxcbiAgICBub3QoKSB7XG4gICAgICByZXR1cm4gT3BlbkFQSVNjaGVtYU9iamVjdDtcbiAgICB9LFxuICAgIGl0ZW1zKCkge1xuICAgICAgcmV0dXJuIE9wZW5BUElTY2hlbWFPYmplY3Q7XG4gICAgfSxcbiAgICBwcm9wZXJ0aWVzOiBPcGVuQVBJU2NoZW1hTWFwLFxuICAgIGRpc2NyaW1pbmF0b3I6IE9wZW5BUElEaXNjcmltaW5hdG9yLFxuICAgIGV4dGVybmFsRG9jczogT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbixcbiAgICB4bWw6IE9wZW5BUElYTUwsXG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBPcGVuQVBJU2NoZW1hT2JqZWN0O1xuIl19