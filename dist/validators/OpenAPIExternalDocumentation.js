"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIExternalDocumentation = {
  validators: {
    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.default)('description of the ExternalDocumentation object must be a string', node, ctx) : null;
    },

    url() {
      return (node, ctx) => {
        if (node && !node.url) return (0, _error.default)('url is a required field for an ExternalDocumentation object', node, ctx);
        if (!(0, _utils.isUrl)(node.url)) return (0, _error.default)('url must be a valid URL', node, ctx);
        return null;
      };
    }

  }
};
var _default = OpenAPIExternalDocumentation;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24uanMiXSwibmFtZXMiOlsiT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiIsInZhbGlkYXRvcnMiLCJkZXNjcmlwdGlvbiIsIm5vZGUiLCJjdHgiLCJ1cmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7OztBQUVBLE1BQU1BLDRCQUE0QixHQUFHO0FBQ25DQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRCxXQUFiLElBQTRCLE9BQU9DLElBQUksQ0FBQ0QsV0FBWixLQUE0QixRQUF4RCxHQUFtRSxvQkFBWSxrRUFBWixFQUFnRkMsSUFBaEYsRUFBc0ZDLEdBQXRGLENBQW5FLEdBQWdLLElBQXZMO0FBQ0QsS0FIUzs7QUFJVkMsSUFBQUEsR0FBRyxHQUFHO0FBQ0osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRSxHQUFsQixFQUF1QixPQUFPLG9CQUFZLDZEQUFaLEVBQTJFRixJQUEzRSxFQUFpRkMsR0FBakYsQ0FBUDtBQUN2QixZQUFJLENBQUMsa0JBQU1ELElBQUksQ0FBQ0UsR0FBWCxDQUFMLEVBQXNCLE9BQU8sb0JBQVkseUJBQVosRUFBdUNGLElBQXZDLEVBQTZDQyxHQUE3QyxDQUFQO0FBQ3RCLGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRDs7QUFWUztBQUR1QixDQUFyQztlQWVlSiw0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmltcG9ydCB7IGlzVXJsIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5jb25zdCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycgPyBjcmVhdGVFcnJvcignZGVzY3JpcHRpb24gb2YgdGhlIEV4dGVybmFsRG9jdW1lbnRhdGlvbiBvYmplY3QgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIHVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmICFub2RlLnVybCkgcmV0dXJuIGNyZWF0ZUVycm9yKCd1cmwgaXMgYSByZXF1aXJlZCBmaWVsZCBmb3IgYW4gRXh0ZXJuYWxEb2N1bWVudGF0aW9uIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICghaXNVcmwobm9kZS51cmwpKSByZXR1cm4gY3JlYXRlRXJyb3IoJ3VybCBtdXN0IGJlIGEgdmFsaWQgVVJMJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uO1xuIl19