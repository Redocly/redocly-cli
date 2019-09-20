"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    name() {
      return (node, ctx) => {
        if (!node.name) return (0, _error.default)('The name property is required for the Open API Tag object', node, ctx, 'key');

        if (node && node.name && typeof node.name !== 'string') {
          return (0, _error.default)('The name field must be a string', node, ctx);
        }

        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return (0, _error.default)('The description field must be a string', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    externalDocs: _OpenAPIExternalDocumentation.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElUYWcuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwiZGVzY3JpcHRpb24iLCJwcm9wZXJ0aWVzIiwiZXh0ZXJuYWxEb2NzIiwiT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O2VBRWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFJLENBQUNELElBQVYsRUFBZ0IsT0FBTyxvQkFBWSwyREFBWixFQUF5RUMsSUFBekUsRUFBK0VDLEdBQS9FLEVBQW9GLEtBQXBGLENBQVA7O0FBQ2hCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRCxJQUFiLElBQXFCLE9BQU9DLElBQUksQ0FBQ0QsSUFBWixLQUFxQixRQUE5QyxFQUF3RDtBQUN0RCxpQkFBTyxvQkFBWSxpQ0FBWixFQUErQ0MsSUFBL0MsRUFBcURDLEdBQXJELENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0QsS0FUUzs7QUFVVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsV0FBYixJQUE0QixPQUFPRixJQUFJLENBQUNFLFdBQVosS0FBNEIsUUFBNUQsRUFBc0U7QUFDcEUsaUJBQU8sb0JBQVksd0NBQVosRUFBc0RGLElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1EOztBQWpCUyxHQURDO0FBb0JiRSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsWUFBWSxFQUFFQztBQURKO0FBcEJDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiBmcm9tICcuL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24nO1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uL2Vycm9yJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgbmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZS5uYW1lKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBuYW1lIHByb3BlcnR5IGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbiBBUEkgVGFnIG9iamVjdCcsIG5vZGUsIGN0eCwgJ2tleScpO1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm5hbWUgJiYgdHlwZW9mIG5vZGUubmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBuYW1lIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBkZXNjcmlwdGlvbiBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGV4dGVybmFsRG9jczogT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbixcbiAgfSxcbn07XG4iXX0=