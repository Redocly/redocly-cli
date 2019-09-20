"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../../error"));

var _OpenAPIFlows = _interopRequireDefault(require("./OpenAPIFlows"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    type() {
      return (node, ctx) => {
        if (!node.type) return (0, _error.default)('The type field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.type !== 'string') return (0, _error.default)('The type field must be a string for the OpenAPI Security Scheme object', node, ctx);
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) return (0, _error.default)('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') return (0, _error.default)('The description field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    name() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') return (0, _error.default)('The name field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    in() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return (0, _error.default)('The in field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.in !== 'string') return (0, _error.default)('The in field must be a string for the OpenAPI Security Scheme object', node, ctx);
        if (!['query', 'header', 'cookie'].includes(node.in)) return (0, _error.default)('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    scheme() {
      return (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.scheme) return (0, _error.default)('The scheme field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.scheme !== 'string') return (0, _error.default)('The scheme field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    bearerFormat() {
      return (node, ctx) => {
        if (node.bearerFormat && node.type !== 'http') return (0, _error.default)('The bearerFormat field is applicable only for http', node, ctx);
        if (!node.bearerFormat && node.type === 'http') return (0, _error.default)('The bearerFormat field is required for the OpenAPI Security Scheme object', node, ctx);
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') return (0, _error.default)('The bearerFormat field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    flows() {
      return (node, ctx) => {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return (0, _error.default)('The flows field is required for the Open API Security Scheme object', node, ctx);
        return null;
      };
    },

    openIdConnectUrl() {
      return (node, ctx) => {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) return (0, _error.default)('The openIdConnectUrl field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.openIdConnectUrl !== 'string') return (0, _error.default)('The openIdConnectUrl field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    }

  },
  properties: {
    flows: _OpenAPIFlows.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9PcGVuQVBJU2VjdXJpdHlTY2hlbWEuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsInR5cGUiLCJub2RlIiwiY3R4IiwiaW5jbHVkZXMiLCJkZXNjcmlwdGlvbiIsIm5hbWUiLCJpbiIsInNjaGVtZSIsImJlYXJlckZvcm1hdCIsImZsb3dzIiwib3BlbklkQ29ubmVjdFVybCIsInByb3BlcnRpZXMiLCJPcGVuQVBJRmxvd3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7OztlQUVlO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBSSxDQUFDRCxJQUFWLEVBQWdCLE9BQU8sb0JBQVksbUVBQVosRUFBaUZDLElBQWpGLEVBQXVGQyxHQUF2RixDQUFQO0FBQ2hCLFlBQUksT0FBT0QsSUFBSSxDQUFDRCxJQUFaLEtBQXFCLFFBQXpCLEVBQW1DLE9BQU8sb0JBQVksd0VBQVosRUFBc0ZDLElBQXRGLEVBQTRGQyxHQUE1RixDQUFQO0FBQ25DLFlBQUksQ0FBQyxDQUFDLFFBQUQsRUFBVyxNQUFYLEVBQW1CLFFBQW5CLEVBQTZCLGVBQTdCLEVBQThDQyxRQUE5QyxDQUF1REYsSUFBSSxDQUFDRCxJQUE1RCxDQUFMLEVBQXdFLE9BQU8sb0JBQVksZ0pBQVosRUFBOEpDLElBQTlKLEVBQW9LQyxHQUFwSyxDQUFQO0FBQ3hFLGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQVJTOztBQVNWRSxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0csV0FBTCxJQUFvQixPQUFPSCxJQUFJLENBQUNHLFdBQVosS0FBNEIsUUFBcEQsRUFBOEQsT0FBTyxvQkFBWSwr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QVA7QUFDakIsZUFBTyxJQUFQO0FBQ0QsT0FKRDtBQUtELEtBckRTOztBQXNEVlEsSUFBQUEsZ0JBQWdCLEdBQUc7QUFDakIsYUFBTyxDQUFDVCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNELElBQUwsS0FBYyxlQUFsQixFQUFtQyxPQUFPLElBQVA7QUFDbkMsWUFBSSxDQUFDQyxJQUFJLENBQUNTLGdCQUFWLEVBQTRCLE9BQU8sb0JBQVksK0VBQVosRUFBNkZULElBQTdGLEVBQW1HQyxHQUFuRyxDQUFQO0FBQzVCLFlBQUksT0FBT0QsSUFBSSxDQUFDUyxnQkFBWixLQUFpQyxRQUFyQyxFQUErQyxPQUFPLG9CQUFZLG9GQUFaLEVBQWtHVCxJQUFsRyxFQUF3R0MsR0FBeEcsQ0FBUDtBQUMvQyxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQ7O0FBN0RTLEdBREM7QUFnRWJTLEVBQUFBLFVBQVUsRUFBRTtBQUNWRixJQUFBQSxLQUFLLEVBQUVHO0FBREc7QUFoRUMsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi8uLi9lcnJvcic7XG5cbmltcG9ydCBPcGVuQVBJRmxvd3MgZnJvbSAnLi9PcGVuQVBJRmxvd3MnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICB0eXBlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlLnR5cGUpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHR5cGUgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUudHlwZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHR5cGUgZmllbGQgbXVzdCBiZSBhIHN0cmluZyBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICghWydhcGlLZXknLCAnaHR0cCcsICdvYXV0aDInLCAnb3BlbklkQ29ubmVjdCddLmluY2x1ZGVzKG5vZGUudHlwZSkpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHR5cGUgdmFsdWUgY2FuIG9ubHkgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgXCJhcGlLZXlcIiwgXCJodHRwXCIsIFwib2F1dGgyXCIsIFwib3BlbklkQ29ubmVjdFwiIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGRlc2NyaXB0aW9uIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBuYW1lKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2FwaUtleScpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUubmFtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIG5hbWUgZmllbGQgbXVzdCBiZSBhIHN0cmluZyBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGluKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2FwaUtleScpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuaW4pIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGluIGZpZWxkIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmluICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgaW4gZmllbGQgbXVzdCBiZSBhIHN0cmluZyBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICghWydxdWVyeScsICdoZWFkZXInLCAnY29va2llJ10uaW5jbHVkZXMobm9kZS5pbikpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGluIHZhbHVlIGNhbiBvbmx5IGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nIFwicXVlcnlcIiwgXCJoZWFkZXJcIiBvciBcImNvb2tpZVwiIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc2NoZW1lKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2h0dHAnKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCFub2RlLnNjaGVtZSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgc2NoZW1lIGZpZWxkIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLnNjaGVtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHNjaGVtZSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYmVhcmVyRm9ybWF0KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuYmVhcmVyRm9ybWF0ICYmIG5vZGUudHlwZSAhPT0gJ2h0dHAnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBiZWFyZXJGb3JtYXQgZmllbGQgaXMgYXBwbGljYWJsZSBvbmx5IGZvciBodHRwJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKCFub2RlLmJlYXJlckZvcm1hdCAmJiBub2RlLnR5cGUgPT09ICdodHRwJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgYmVhcmVyRm9ybWF0IGZpZWxkIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKG5vZGUuYmVhcmVyRm9ybWF0ICYmIHR5cGVvZiBub2RlLmJlYXJlckZvcm1hdCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGJlYXJlckZvcm1hdCBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZmxvd3MoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnb2F1dGgyJykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICghbm9kZS5mbG93cykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZmxvd3MgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuIEFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgb3BlbklkQ29ubmVjdFVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnR5cGUgIT09ICdvcGVuSWRDb25uZWN0JykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICghbm9kZS5vcGVuSWRDb25uZWN0VXJsKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBvcGVuSWRDb25uZWN0VXJsIGZpZWxkIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLm9wZW5JZENvbm5lY3RVcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBvcGVuSWRDb25uZWN0VXJsIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGZsb3dzOiBPcGVuQVBJRmxvd3MsXG4gIH0sXG59O1xuIl19