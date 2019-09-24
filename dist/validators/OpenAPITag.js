"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

var _error = require("../error");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    name() {
      return (node, ctx) => {
        if (!node.name) return (0, _error.createErrorMissingRequiredField)('name', node, ctx);

        if (node && node.name && typeof node.name !== 'string') {
          return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElUYWcuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwiZGVzY3JpcHRpb24iLCJwcm9wZXJ0aWVzIiwiZXh0ZXJuYWxEb2NzIiwiT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O2VBRWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFJLENBQUNELElBQVYsRUFBZ0IsT0FBTyw0Q0FBZ0MsTUFBaEMsRUFBd0NDLElBQXhDLEVBQThDQyxHQUE5QyxDQUFQOztBQUNoQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0QsSUFBYixJQUFxQixPQUFPQyxJQUFJLENBQUNELElBQVosS0FBcUIsUUFBOUMsRUFBd0Q7QUFDdEQsaUJBQU8sMENBQThCLFFBQTlCLEVBQXdDQyxJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTkQ7QUFPRCxLQVRTOztBQVVWQyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNGLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRSxXQUFiLElBQTRCLE9BQU9GLElBQUksQ0FBQ0UsV0FBWixLQUE0QixRQUE1RCxFQUFzRTtBQUNwRSxpQkFBTywwQ0FBOEIsUUFBOUIsRUFBd0NGLElBQXhDLEVBQThDQyxHQUE5QyxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1EOztBQWpCUyxHQURDO0FBb0JiRSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsWUFBWSxFQUFFQztBQURKO0FBcEJDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiBmcm9tICcuL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24nO1xuaW1wb3J0IHsgY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCwgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi9lcnJvcic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIG5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUubmFtZSkgcmV0dXJuIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ25hbWUnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm5hbWUgJiYgdHlwZW9mIG5vZGUubmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGV4dGVybmFsRG9jczogT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbixcbiAgfSxcbn07XG4iXX0=