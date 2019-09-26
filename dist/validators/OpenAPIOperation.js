"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIResponse = require("./OpenAPIResponse");

var _OpenAPIParameter = require("./OpenAPIParameter");

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

var _OpenAPICallback = require("./OpenAPICallback");

var _OpenAPIRequestBody = require("./OpenAPIRequestBody");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-cycle */
var _default = {
  name: 'OpenAPIOperation',
  validators: {
    tags() {
      return (node, ctx) => {
        if (node && node.tags && !Array.isArray(node.tags)) {
          return (0, _error.default)('The tags field must be an array in the Open API Operation object.', node, ctx);
        }

        if (node && node.tags && node.tags.filter(item => typeof item !== 'string').length > 0) {
          return (0, _error.default)('Items of the tags array must be strings in the Open API Operation object.', node, ctx);
        }

        return null;
      };
    },

    summary() {
      return (node, ctx) => {
        if (node && node.summary && typeof node.summary !== 'string') return (0, _error.default)('The summary field must be a string', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return (0, _error.default)('The description field must be a string', node, ctx);
        return null;
      };
    },

    operationId() {
      return (node, ctx) => {
        if (node && node.operationId && typeof node.operationId !== 'string') return (0, _error.default)('The operationId field must be a string', node, ctx);
        return null;
      };
    },

    responses() {
      return (node, ctx) => !node.responses ? (0, _error.default)('Operation must include responses section', node, ctx, 'key') : null;
    },

    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return (0, _error.default)('The deprecated field must be a string', node, ctx);
        return null;
      };
    },

    security() {
      return () => null;
    }

  },
  properties: {
    externalDocs: _OpenAPIExternalDocumentation.default,
    parameters: _OpenAPIParameter.OpenAPIParameter,
    requestBody: _OpenAPIRequestBody.OpenAPIRequestBody,
    responses: _OpenAPIResponse.OpenAPIResponseMap,
    callbacks: _OpenAPICallback.OpenAPICallbackMap,
    // TODO:
    // security() {},
    servers: _OpenAPIServer.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElPcGVyYXRpb24uanMiXSwibmFtZXMiOlsibmFtZSIsInZhbGlkYXRvcnMiLCJ0YWdzIiwibm9kZSIsImN0eCIsIkFycmF5IiwiaXNBcnJheSIsImZpbHRlciIsIml0ZW0iLCJsZW5ndGgiLCJzdW1tYXJ5IiwiZGVzY3JpcHRpb24iLCJvcGVyYXRpb25JZCIsInJlc3BvbnNlcyIsImRlcHJlY2F0ZWQiLCJzZWN1cml0eSIsInByb3BlcnRpZXMiLCJleHRlcm5hbERvY3MiLCJPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIiwicGFyYW1ldGVycyIsIk9wZW5BUElQYXJhbWV0ZXIiLCJyZXF1ZXN0Qm9keSIsIk9wZW5BUElSZXF1ZXN0Qm9keSIsIk9wZW5BUElSZXNwb25zZU1hcCIsImNhbGxiYWNrcyIsIk9wZW5BUElDYWxsYmFja01hcCIsInNlcnZlcnMiLCJPcGVuQVBJU2VydmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFSQTtlQVVlO0FBQ2JBLEVBQUFBLElBQUksRUFBRSxrQkFETztBQUViQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0QsSUFBYixJQUFxQixDQUFDRyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsSUFBSSxDQUFDRCxJQUFuQixDQUExQixFQUFvRDtBQUNsRCxpQkFBTyxvQkFBWSxtRUFBWixFQUFpRkMsSUFBakYsRUFBdUZDLEdBQXZGLENBQVA7QUFDRDs7QUFDRCxZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0QsSUFBYixJQUFxQkMsSUFBSSxDQUFDRCxJQUFMLENBQVVLLE1BQVYsQ0FBa0JDLElBQUQsSUFBVSxPQUFPQSxJQUFQLEtBQWdCLFFBQTNDLEVBQXFEQyxNQUFyRCxHQUE4RCxDQUF2RixFQUEwRjtBQUN4RixpQkFBTyxvQkFBWSwyRUFBWixFQUF5Rk4sSUFBekYsRUFBK0ZDLEdBQS9GLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQVJEO0FBU0QsS0FYUzs7QUFZVk0sSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDUCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ08sT0FBYixJQUF3QixPQUFPUCxJQUFJLENBQUNPLE9BQVosS0FBd0IsUUFBcEQsRUFBOEQsT0FBTyxvQkFBWSxvQ0FBWixFQUFrRFAsSUFBbEQsRUFBd0RDLEdBQXhELENBQVA7QUFDOUQsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBakJTOztBQWtCVk8sSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDUixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ1EsV0FBYixJQUE0QixPQUFPUixJQUFJLENBQUNRLFdBQVosS0FBNEIsUUFBNUQsRUFBc0UsT0FBTyxvQkFBWSx3Q0FBWixFQUFzRFIsSUFBdEQsRUFBNERDLEdBQTVELENBQVA7QUFDdEUsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBdkJTOztBQXdCVlEsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDVCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ1MsV0FBYixJQUE0QixPQUFPVCxJQUFJLENBQUNTLFdBQVosS0FBNEIsUUFBNUQsRUFBc0UsT0FBTyxvQkFBWSx3Q0FBWixFQUFzRFQsSUFBdEQsRUFBNERDLEdBQTVELENBQVA7QUFDdEUsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBN0JTOztBQThCVlMsSUFBQUEsU0FBUyxHQUFHO0FBQ1YsYUFBTyxDQUFDVixJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBSSxDQUFDVSxTQUFOLEdBQWtCLG9CQUFZLDBDQUFaLEVBQXdEVixJQUF4RCxFQUE4REMsR0FBOUQsRUFBbUUsS0FBbkUsQ0FBbEIsR0FBOEYsSUFBckg7QUFDRCxLQWhDUzs7QUFpQ1ZVLElBQUFBLFVBQVUsR0FBRztBQUNYLGFBQU8sQ0FBQ1gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNXLFVBQWIsSUFBMkIsT0FBT1gsSUFBSSxDQUFDVyxVQUFaLEtBQTJCLFNBQTFELEVBQXFFLE9BQU8sb0JBQVksdUNBQVosRUFBcURYLElBQXJELEVBQTJEQyxHQUEzRCxDQUFQO0FBQ3JFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQXRDUzs7QUF1Q1ZXLElBQUFBLFFBQVEsR0FBRztBQUNULGFBQU8sTUFBTSxJQUFiO0FBQ0Q7O0FBekNTLEdBRkM7QUE2Q2JDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxZQUFZLEVBQUVDLHFDQURKO0FBRVZDLElBQUFBLFVBQVUsRUFBRUMsa0NBRkY7QUFHVkMsSUFBQUEsV0FBVyxFQUFFQyxzQ0FISDtBQUlWVCxJQUFBQSxTQUFTLEVBQUVVLG1DQUpEO0FBS1ZDLElBQUFBLFNBQVMsRUFBRUMsbUNBTEQ7QUFNVjtBQUNBO0FBQ0FDLElBQUFBLE9BQU8sRUFBRUM7QUFSQztBQTdDQyxDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWN5Y2xlICovXG5pbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5pbXBvcnQgeyBPcGVuQVBJUmVzcG9uc2VNYXAgfSBmcm9tICcuL09wZW5BUElSZXNwb25zZSc7XG5pbXBvcnQgeyBPcGVuQVBJUGFyYW1ldGVyIH0gZnJvbSAnLi9PcGVuQVBJUGFyYW1ldGVyJztcbmltcG9ydCBPcGVuQVBJU2VydmVyIGZyb20gJy4vT3BlbkFQSVNlcnZlcic7XG5pbXBvcnQgT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiBmcm9tICcuL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24nO1xuaW1wb3J0IHsgT3BlbkFQSUNhbGxiYWNrTWFwIH0gZnJvbSAnLi9PcGVuQVBJQ2FsbGJhY2snO1xuaW1wb3J0IHsgT3BlbkFQSVJlcXVlc3RCb2R5IH0gZnJvbSAnLi9PcGVuQVBJUmVxdWVzdEJvZHknO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG5hbWU6ICdPcGVuQVBJT3BlcmF0aW9uJyxcbiAgdmFsaWRhdG9yczoge1xuICAgIHRhZ3MoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnRhZ3MgJiYgIUFycmF5LmlzQXJyYXkobm9kZS50YWdzKSkge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHRhZ3MgZmllbGQgbXVzdCBiZSBhbiBhcnJheSBpbiB0aGUgT3BlbiBBUEkgT3BlcmF0aW9uIG9iamVjdC4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudGFncyAmJiBub2RlLnRhZ3MuZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSAhPT0gJ3N0cmluZycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ0l0ZW1zIG9mIHRoZSB0YWdzIGFycmF5IG11c3QgYmUgc3RyaW5ncyBpbiB0aGUgT3BlbiBBUEkgT3BlcmF0aW9uIG9iamVjdC4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHN1bW1hcnkoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnN1bW1hcnkgJiYgdHlwZW9mIG5vZGUuc3VtbWFyeSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHN1bW1hcnkgZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGRlc2NyaXB0aW9uIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBvcGVyYXRpb25JZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUub3BlcmF0aW9uSWQgJiYgdHlwZW9mIG5vZGUub3BlcmF0aW9uSWQgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBvcGVyYXRpb25JZCBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVzcG9uc2VzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICghbm9kZS5yZXNwb25zZXMgPyBjcmVhdGVFcnJvcignT3BlcmF0aW9uIG11c3QgaW5jbHVkZSByZXNwb25zZXMgc2VjdGlvbicsIG5vZGUsIGN0eCwgJ2tleScpIDogbnVsbCk7XG4gICAgfSxcbiAgICBkZXByZWNhdGVkKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5kZXByZWNhdGVkICYmIHR5cGVvZiBub2RlLmRlcHJlY2F0ZWQgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVwcmVjYXRlZCBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc2VjdXJpdHkoKSB7XG4gICAgICByZXR1cm4gKCkgPT4gbnVsbDtcbiAgICB9LFxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgZXh0ZXJuYWxEb2NzOiBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uLFxuICAgIHBhcmFtZXRlcnM6IE9wZW5BUElQYXJhbWV0ZXIsXG4gICAgcmVxdWVzdEJvZHk6IE9wZW5BUElSZXF1ZXN0Qm9keSxcbiAgICByZXNwb25zZXM6IE9wZW5BUElSZXNwb25zZU1hcCxcbiAgICBjYWxsYmFja3M6IE9wZW5BUElDYWxsYmFja01hcCxcbiAgICAvLyBUT0RPOlxuICAgIC8vIHNlY3VyaXR5KCkge30sXG4gICAgc2VydmVyczogT3BlbkFQSVNlcnZlcixcbiAgfSxcbn07XG4iXX0=