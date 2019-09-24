"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIHeaderMap = exports.OpenAPIHeader = void 0;

var _error = _interopRequireWildcard(require("../error"));

var _OpenAPIExample = require("./OpenAPIExample");

var _OpenAPIMediaObject = require("./OpenAPIMediaObject");

var _OpenAPISchema = _interopRequireDefault(require("./OpenAPISchema"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// eslint-disable-next-line import/no-cycle
const OpenAPIHeader = {
  validators: {
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    required() {
      return (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);

        if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
          return (0, _error.default)('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
        }

        return null;
      };
    },

    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    allowEmptyValue() {
      return (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return (0, _error.createErrrorFieldTypeMismatch)('boolean', node, ctx);
        return null;
      };
    },

    example() {
      return (node, ctx) => {
        if (node.example && node.examples) return (0, _error.createErrorMutuallyExclusiveFields)(['example', 'examples'], node, ctx);
        return null;
      };
    },

    examples() {
      return (node, ctx) => {
        if (node.example && node.examples) return (0, _error.createErrorMutuallyExclusiveFields)(['examples', 'example'], node, ctx);
        return null;
      };
    }

  },
  properties: {
    schema: _OpenAPISchema.default,
    content: _OpenAPIMediaObject.OpenAPIMediaTypeObject,
    examples: _OpenAPIExample.OpenAPIExampleMap
  }
};
exports.OpenAPIHeader = OpenAPIHeader;
const OpenAPIHeaderMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIHeader;
    });
    return props;
  }

};
exports.OpenAPIHeaderMap = OpenAPIHeaderMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElIZWFkZXIuanMiXSwibmFtZXMiOlsiT3BlbkFQSUhlYWRlciIsInZhbGlkYXRvcnMiLCJkZXNjcmlwdGlvbiIsIm5vZGUiLCJjdHgiLCJyZXF1aXJlZCIsImluIiwiZGVwcmVjYXRlZCIsImFsbG93RW1wdHlWYWx1ZSIsImV4cGxvZGUiLCJhbGxvd1Jlc2VydmVkIiwiZXhhbXBsZSIsImV4YW1wbGVzIiwicHJvcGVydGllcyIsInNjaGVtYSIsIk9wZW5BUElTY2hlbWFPYmplY3QiLCJjb250ZW50IiwiT3BlbkFQSU1lZGlhVHlwZU9iamVjdCIsIk9wZW5BUElFeGFtcGxlTWFwIiwiT3BlbkFQSUhlYWRlck1hcCIsInByb3BzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7Ozs7O0FBRkE7QUFJTyxNQUFNQSxhQUFhLEdBQUc7QUFDM0JDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRCxXQUFiLElBQTRCLE9BQU9DLElBQUksQ0FBQ0QsV0FBWixLQUE0QixRQUE1RCxFQUFzRSxPQUFPLDBDQUE4QixRQUE5QixFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDdEUsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBTlM7O0FBT1ZDLElBQUFBLFFBQVEsR0FBRztBQUNULGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLFFBQWIsSUFBeUIsT0FBT0YsSUFBSSxDQUFDRSxRQUFaLEtBQXlCLFNBQXRELEVBQWlFLE9BQU8sMENBQThCLFNBQTlCLEVBQXlDRixJQUF6QyxFQUErQ0MsR0FBL0MsQ0FB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Q1YsSUFBRCxFQUFPO0FBQ2YsVUFBTWlCLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZbkIsSUFBWixFQUFrQm9CLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVd4QixhQUFYO0FBQ0QsS0FGRDtBQUdBLFdBQU9vQixLQUFQO0FBQ0Q7O0FBUDZCLENBQXpCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yLCB7IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoLCBjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzIH0gZnJvbSAnLi4vZXJyb3InO1xuaW1wb3J0IHsgT3BlbkFQSUV4YW1wbGVNYXAgfSBmcm9tICcuL09wZW5BUElFeGFtcGxlJztcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpbXBvcnQvbm8tY3ljbGVcbmltcG9ydCB7IE9wZW5BUElNZWRpYVR5cGVPYmplY3QgfSBmcm9tICcuL09wZW5BUElNZWRpYU9iamVjdCc7XG5pbXBvcnQgT3BlbkFQSVNjaGVtYU9iamVjdCBmcm9tICcuL09wZW5BUElTY2hlbWEnO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUhlYWRlciA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVxdWlyZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnJlcXVpcmVkICYmIHR5cGVvZiBub2RlLnJlcXVpcmVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuaW4gJiYgbm9kZS5pbiA9PT0gJ3BhdGgnICYmICEobm9kZS5yZXF1aXJlZCB8fCBub2RlLnJlcXVpcmVkICE9PSB0cnVlKSkge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignSWYgdGhlIHBhcmFtZXRlciBsb2NhdGlvbiBpcyBcInBhdGhcIiwgdGhpcyBwcm9wZXJ0eSBpcyBSRVFVSVJFRCBhbmQgaXRzIHZhbHVlIE1VU1QgYmUgdHJ1ZS4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlcHJlY2F0ZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlcHJlY2F0ZWQgJiYgdHlwZW9mIG5vZGUuZGVwcmVjYXRlZCAhPT0gJ2Jvb2xlYW4nKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2Jvb2xlYW4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBhbGxvd0VtcHR5VmFsdWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmFsbG93RW1wdHlWYWx1ZSAmJiB0eXBlb2Ygbm9kZS5hbGxvd0VtcHR5VmFsdWUgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZXhwbG9kZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZXhwbG9kZSAmJiB0eXBlb2Ygbm9kZS5leHBsb2RlICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGFsbG93UmVzZXJ2ZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmFsbG93UmVzZXJ2ZWQgJiYgdHlwZW9mIG5vZGUuYWxsb3dSZXNlcnZlZCAhPT0gJ2Jvb2xlYW4nKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ2Jvb2xlYW4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleGFtcGxlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuZXhhbXBsZSAmJiBub2RlLmV4YW1wbGVzKSByZXR1cm4gY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyhbJ2V4YW1wbGUnLCAnZXhhbXBsZXMnXSwgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZXhhbXBsZXMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5leGFtcGxlICYmIG5vZGUuZXhhbXBsZXMpIHJldHVybiBjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzKFsnZXhhbXBsZXMnLCAnZXhhbXBsZSddLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIHNjaGVtYTogT3BlbkFQSVNjaGVtYU9iamVjdCxcbiAgICBjb250ZW50OiBPcGVuQVBJTWVkaWFUeXBlT2JqZWN0LFxuICAgIGV4YW1wbGVzOiBPcGVuQVBJRXhhbXBsZU1hcCxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJSGVhZGVyTWFwID0ge1xuICBwcm9wZXJ0aWVzKG5vZGUpIHtcbiAgICBjb25zdCBwcm9wcyA9IHt9O1xuICAgIE9iamVjdC5rZXlzKG5vZGUpLmZvckVhY2goKGspID0+IHtcbiAgICAgIHByb3BzW2tdID0gT3BlbkFQSUhlYWRlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19