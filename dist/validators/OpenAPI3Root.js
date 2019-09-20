"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIInfo = require("./OpenAPIInfo");

var _OpenAPIPaths = require("./OpenAPIPaths");

var _OpenAPIComponents = _interopRequireDefault(require("./OpenAPIComponents"));

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPISecurityRequirement = _interopRequireDefault(require("./OpenAPISecurityRequirement"));

var _OpenAPITag = _interopRequireDefault(require("./OpenAPITag"));

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    openapi() {
      return (node, ctx) => {
        if (node && !node.openapi) return (0, _error.default)('The openapi field must be included to the root.', node, ctx);
        return null;
      };
    },

    info() {
      return (node, ctx) => {
        if (node && !node.info) return (0, _error.default)('The info field must be included to the root.', node, ctx);
        return null;
      };
    },

    paths() {
      return (node, ctx) => {
        if (node && !node.paths) return (0, _error.default)('The paths field must be included to the root.', node, ctx);
        return null;
      };
    },

    security() {
      return () => null;
    }

  },
  properties: {
    info: _OpenAPIInfo.OpenAPIInfo,
    paths: _OpenAPIPaths.OpenAPIPaths,
    servers: _OpenAPIServer.default,
    components: _OpenAPIComponents.default,
    // security: OpenAPISecurityRequirement,
    tags: _OpenAPITag.default,
    externalDocs: _OpenAPIExternalDocumentation.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUEkzUm9vdC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0b3JzIiwib3BlbmFwaSIsIm5vZGUiLCJjdHgiLCJpbmZvIiwicGF0aHMiLCJzZWN1cml0eSIsInByb3BlcnRpZXMiLCJPcGVuQVBJSW5mbyIsIk9wZW5BUElQYXRocyIsInNlcnZlcnMiLCJPcGVuQVBJU2VydmVyIiwiY29tcG9uZW50cyIsIk9wZW5BUElDb21wb25lbnRzIiwidGFncyIsIk9wZW5BUElUYWciLCJleHRlcm5hbERvY3MiLCJPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRCxPQUFsQixFQUEyQixPQUFPLG9CQUFZLGlEQUFaLEVBQStEQyxJQUEvRCxFQUFxRUMsR0FBckUsQ0FBUDtBQUMzQixlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FOUzs7QUFPVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRSxJQUFsQixFQUF3QixPQUFPLG9CQUFZLDhDQUFaLEVBQTRERixJQUE1RCxFQUFrRUMsR0FBbEUsQ0FBUDtBQUN4QixlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FaUzs7QUFhVkUsSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRyxLQUFsQixFQUF5QixPQUFPLG9CQUFZLCtDQUFaLEVBQTZESCxJQUE3RCxFQUFtRUMsR0FBbkUsQ0FBUDtBQUN6QixlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FsQlM7O0FBbUJWRyxJQUFBQSxRQUFRLEdBQUc7QUFDVCxhQUFPLE1BQU0sSUFBYjtBQUNEOztBQXJCUyxHQURDO0FBd0JiQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkgsSUFBQUEsSUFBSSxFQUFFSSx3QkFESTtBQUVWSCxJQUFBQSxLQUFLLEVBQUVJLDBCQUZHO0FBR1ZDLElBQUFBLE9BQU8sRUFBRUMsc0JBSEM7QUFJVkMsSUFBQUEsVUFBVSxFQUFFQywwQkFKRjtBQUtWO0FBQ0FDLElBQUFBLElBQUksRUFBRUMsbUJBTkk7QUFPVkMsSUFBQUEsWUFBWSxFQUFFQztBQVBKO0FBeEJDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5pbXBvcnQgeyBPcGVuQVBJSW5mbyB9IGZyb20gJy4vT3BlbkFQSUluZm8nO1xuaW1wb3J0IHsgT3BlbkFQSVBhdGhzIH0gZnJvbSAnLi9PcGVuQVBJUGF0aHMnO1xuaW1wb3J0IE9wZW5BUElDb21wb25lbnRzIGZyb20gJy4vT3BlbkFQSUNvbXBvbmVudHMnO1xuaW1wb3J0IE9wZW5BUElTZXJ2ZXIgZnJvbSAnLi9PcGVuQVBJU2VydmVyJztcbmltcG9ydCBPcGVuQVBJU2VjdXJpdHlSZXF1aXJlbWVudCBmcm9tICcuL09wZW5BUElTZWN1cml0eVJlcXVpcmVtZW50JztcbmltcG9ydCBPcGVuQVBJVGFnIGZyb20gJy4vT3BlbkFQSVRhZyc7XG5pbXBvcnQgT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiBmcm9tICcuL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24nO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBvcGVuYXBpKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgIW5vZGUub3BlbmFwaSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgb3BlbmFwaSBmaWVsZCBtdXN0IGJlIGluY2x1ZGVkIHRvIHRoZSByb290LicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGluZm8oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiAhbm9kZS5pbmZvKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBpbmZvIGZpZWxkIG11c3QgYmUgaW5jbHVkZWQgdG8gdGhlIHJvb3QuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcGF0aHMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiAhbm9kZS5wYXRocykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgcGF0aHMgZmllbGQgbXVzdCBiZSBpbmNsdWRlZCB0byB0aGUgcm9vdC4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzZWN1cml0eSgpIHtcbiAgICAgIHJldHVybiAoKSA9PiBudWxsO1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBpbmZvOiBPcGVuQVBJSW5mbyxcbiAgICBwYXRoczogT3BlbkFQSVBhdGhzLFxuICAgIHNlcnZlcnM6IE9wZW5BUElTZXJ2ZXIsXG4gICAgY29tcG9uZW50czogT3BlbkFQSUNvbXBvbmVudHMsXG4gICAgLy8gc2VjdXJpdHk6IE9wZW5BUElTZWN1cml0eVJlcXVpcmVtZW50LFxuICAgIHRhZ3M6IE9wZW5BUElUYWcsXG4gICAgZXh0ZXJuYWxEb2NzOiBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uLFxuICB9LFxufTtcbiJdfQ==