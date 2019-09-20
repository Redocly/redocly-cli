"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIRequestBodyMap = exports.OpenAPIRequestBody = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIMediaObject = require("./OpenAPIMediaObject");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIRequestBody = {
  validators: {
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return (0, _error.default)('The required field must be a string.', node, ctx);
        }

        return null;
      };
    },

    content() {
      return (node, ctx) => {
        if (node && !node.content) {
          return (0, _error.default)('The content field is required for the Open API RequestBody object.', node, ctx, 'key');
        }

        return null;
      };
    },

    required() {
      return (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') {
          return (0, _error.default)('The required field must be a boolean.', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    content: _OpenAPIMediaObject.OpenAPIMediaTypeObject
  }
};
exports.OpenAPIRequestBody = OpenAPIRequestBody;
const OpenAPIRequestBodyMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIRequestBody;
    });
    return props;
  }

};
exports.OpenAPIRequestBodyMap = OpenAPIRequestBodyMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElSZXF1ZXN0Qm9keS5qcyJdLCJuYW1lcyI6WyJPcGVuQVBJUmVxdWVzdEJvZHkiLCJ2YWxpZGF0b3JzIiwiZGVzY3JpcHRpb24iLCJub2RlIiwiY3R4IiwiY29udGVudCIsInJlcXVpcmVkIiwicHJvcGVydGllcyIsIk9wZW5BUElNZWRpYVR5cGVPYmplY3QiLCJPcGVuQVBJUmVxdWVzdEJvZHlNYXAiLCJwcm9wcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O0FBRU8sTUFBTUEsa0JBQWtCLEdBQUc7QUFDaENDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRCxXQUFiLElBQTRCLE9BQU9DLElBQUksQ0FBQ0QsV0FBWixLQUE0QixRQUE1RCxFQUFzRTtBQUNwRSxpQkFBTyxvQkFBWSxzQ0FBWixFQUFvREMsSUFBcEQsRUFBMERDLEdBQTFELENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0FSUzs7QUFTVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRSxPQUFsQixFQUEyQjtBQUN6QixpQkFBTyxvQkFBWSxvRUFBWixFQUFrRkYsSUFBbEYsRUFBd0ZDLEdBQXhGLEVBQTZGLEtBQTdGLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0FoQlM7O0FBaUJWRSxJQUFBQSxRQUFRLEdBQUc7QUFDVCxhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRyxRQUFiLElBQXlCLE9BQU9ILElBQUksQ0FBQ0csUUFBWixLQUF5QixTQUF0RCxFQUFpRTtBQUMvRCxpQkFBTyxvQkFBWSx1Q0FBWixFQUFxREgsSUFBckQsRUFBMkRDLEdBQTNELENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQ7O0FBeEJTLEdBRG9CO0FBMkJoQ0csRUFBQUEsVUFBVSxFQUFFO0FBQ1ZGLElBQUFBLE9BQU8sRUFBRUc7QUFEQztBQTNCb0IsQ0FBM0I7O0FBZ0NBLE1BQU1DLHFCQUFxQixHQUFHO0FBQ25DRixFQUFBQSxVQUFVLENBQUNKLElBQUQsRUFBTztBQUNmLFVBQU1PLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZVCxJQUFaLEVBQWtCVSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CSixNQUFBQSxLQUFLLENBQUNJLENBQUQsQ0FBTCxHQUFXZCxrQkFBWDtBQUNELEtBRkQ7QUFHQSxXQUFPVSxLQUFQO0FBQ0Q7O0FBUGtDLENBQTlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uL2Vycm9yJztcbmltcG9ydCB7IE9wZW5BUElNZWRpYVR5cGVPYmplY3QgfSBmcm9tICcuL09wZW5BUElNZWRpYU9iamVjdCc7XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJUmVxdWVzdEJvZHkgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZGVzY3JpcHRpb24gJiYgdHlwZW9mIG5vZGUuZGVzY3JpcHRpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgcmVxdWlyZWQgZmllbGQgbXVzdCBiZSBhIHN0cmluZy4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGNvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiAhbm9kZS5jb250ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgY29udGVudCBmaWVsZCBpcyByZXF1aXJlZCBmb3IgdGhlIE9wZW4gQVBJIFJlcXVlc3RCb2R5IG9iamVjdC4nLCBub2RlLCBjdHgsICdrZXknKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICByZXF1aXJlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUucmVxdWlyZWQgJiYgdHlwZW9mIG5vZGUucmVxdWlyZWQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHJlcXVpcmVkIGZpZWxkIG11c3QgYmUgYSBib29sZWFuLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb250ZW50OiBPcGVuQVBJTWVkaWFUeXBlT2JqZWN0LFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElSZXF1ZXN0Qm9keU1hcCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElSZXF1ZXN0Qm9keTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19