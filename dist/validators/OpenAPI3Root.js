"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = require("../error");

var _OpenAPIInfo = require("./OpenAPIInfo");

var _OpenAPIPaths = require("./OpenAPIPaths");

var _OpenAPIComponents = _interopRequireDefault(require("./OpenAPIComponents"));

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPITag = _interopRequireDefault(require("./OpenAPITag"));

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import OpenAPISecurityRequirement from './OpenAPISecurityRequirement';
var _default = {
  validators: {
    openapi() {
      return (node, ctx) => {
        if (node && !node.openapi) return (0, _error.createErrorMissingRequiredField)('openapi', node, ctx);
        return null;
      };
    },

    info() {
      return (node, ctx) => {
        if (node && !node.info) return (0, _error.createErrorMissingRequiredField)('info', node, ctx);
        return null;
      };
    },

    paths() {
      return (node, ctx) => {
        if (node && !node.paths) return (0, _error.createErrorMissingRequiredField)('paths', node, ctx);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUEkzUm9vdC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0b3JzIiwib3BlbmFwaSIsIm5vZGUiLCJjdHgiLCJpbmZvIiwicGF0aHMiLCJzZWN1cml0eSIsInByb3BlcnRpZXMiLCJPcGVuQVBJSW5mbyIsIk9wZW5BUElQYXRocyIsInNlcnZlcnMiLCJPcGVuQVBJU2VydmVyIiwiY29tcG9uZW50cyIsIk9wZW5BUElDb21wb25lbnRzIiwidGFncyIsIk9wZW5BUElUYWciLCJleHRlcm5hbERvY3MiLCJPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7QUFGQTtlQUllO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxPQUFPLEdBQUc7QUFDUixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSSxDQUFDQSxJQUFJLENBQUNELE9BQWxCLEVBQTJCLE9BQU8sNENBQWdDLFNBQWhDLEVBQTJDQyxJQUEzQyxFQUFpREMsR0FBakQsQ0FBUDtBQUMzQixlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FOUzs7QUFPVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRSxJQUFsQixFQUF3QixPQUFPLDRDQUFnQyxNQUFoQyxFQUF3Q0YsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDeEIsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBWlM7O0FBYVZFLElBQUFBLEtBQUssR0FBRztBQUNOLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJLENBQUNBLElBQUksQ0FBQ0csS0FBbEIsRUFBeUIsT0FBTyw0Q0FBZ0MsT0FBaEMsRUFBeUNILElBQXpDLEVBQStDQyxHQUEvQyxDQUFQO0FBQ3pCLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQWxCUzs7QUFtQlZHLElBQUFBLFFBQVEsR0FBRztBQUNULGFBQU8sTUFBTSxJQUFiO0FBQ0Q7O0FBckJTLEdBREM7QUF3QmJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWSCxJQUFBQSxJQUFJLEVBQUVJLHdCQURJO0FBRVZILElBQUFBLEtBQUssRUFBRUksMEJBRkc7QUFHVkMsSUFBQUEsT0FBTyxFQUFFQyxzQkFIQztBQUlWQyxJQUFBQSxVQUFVLEVBQUVDLDBCQUpGO0FBS1Y7QUFDQUMsSUFBQUEsSUFBSSxFQUFFQyxtQkFOSTtBQU9WQyxJQUFBQSxZQUFZLEVBQUVDO0FBUEo7QUF4QkMsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQgfSBmcm9tICcuLi9lcnJvcic7XG5cbmltcG9ydCB7IE9wZW5BUElJbmZvIH0gZnJvbSAnLi9PcGVuQVBJSW5mbyc7XG5pbXBvcnQgeyBPcGVuQVBJUGF0aHMgfSBmcm9tICcuL09wZW5BUElQYXRocyc7XG5pbXBvcnQgT3BlbkFQSUNvbXBvbmVudHMgZnJvbSAnLi9PcGVuQVBJQ29tcG9uZW50cyc7XG5pbXBvcnQgT3BlbkFQSVNlcnZlciBmcm9tICcuL09wZW5BUElTZXJ2ZXInO1xuLy8gaW1wb3J0IE9wZW5BUElTZWN1cml0eVJlcXVpcmVtZW50IGZyb20gJy4vT3BlbkFQSVNlY3VyaXR5UmVxdWlyZW1lbnQnO1xuaW1wb3J0IE9wZW5BUElUYWcgZnJvbSAnLi9PcGVuQVBJVGFnJztcbmltcG9ydCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIGZyb20gJy4vT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIG9wZW5hcGkoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiAhbm9kZS5vcGVuYXBpKSByZXR1cm4gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgnb3BlbmFwaScsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGluZm8oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiAhbm9kZS5pbmZvKSByZXR1cm4gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgnaW5mbycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHBhdGhzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgIW5vZGUucGF0aHMpIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCdwYXRocycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHNlY3VyaXR5KCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGluZm86IE9wZW5BUElJbmZvLFxuICAgIHBhdGhzOiBPcGVuQVBJUGF0aHMsXG4gICAgc2VydmVyczogT3BlbkFQSVNlcnZlcixcbiAgICBjb21wb25lbnRzOiBPcGVuQVBJQ29tcG9uZW50cyxcbiAgICAvLyBzZWN1cml0eTogT3BlbkFQSVNlY3VyaXR5UmVxdWlyZW1lbnQsXG4gICAgdGFnczogT3BlbkFQSVRhZyxcbiAgICBleHRlcm5hbERvY3M6IE9wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24sXG4gIH0sXG59O1xuIl19