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
        if (node.type !== 'http') return null;
        if (!node.bearerFormat) return (0, _error.default)('The bearerFormat field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.scheme !== 'string') return (0, _error.default)('The bearerFormat field must be a string for the OpenAPI Security Scheme object', node, ctx);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9PcGVuQVBJU2VjdXJpdHlTY2hlbWEuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsInR5cGUiLCJub2RlIiwiY3R4IiwiaW5jbHVkZXMiLCJkZXNjcmlwdGlvbiIsIm5hbWUiLCJpbiIsInNjaGVtZSIsImJlYXJlckZvcm1hdCIsImZsb3dzIiwib3BlbklkQ29ubmVjdFVybCIsInByb3BlcnRpZXMiLCJPcGVuQVBJRmxvd3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7OztlQUVlO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBSSxDQUFDRCxJQUFWLEVBQWdCLE9BQU8sb0JBQVksbUVBQVosRUFBaUZDLElBQWpGLEVBQXVGQyxHQUF2RixDQUFQO0FBQ2hCLFlBQUksT0FBT0QsSUFBSSxDQUFDRCxJQUFaLEtBQXFCLFFBQXpCLEVBQW1DLE9BQU8sb0JBQVksd0VBQVosRUFBc0ZDLElBQXRGLEVBQTRGQyxHQUE1RixDQUFQO0FBQ25DLFlBQUksQ0FBQyxDQUFDLFFBQUQsRUFBVyxNQUFYLEVBQW1CLFFBQW5CLEVBQTZCLGVBQTdCLEVBQThDQyxRQUE5QyxDQUF1REYsSUFBSSxDQUFDRCxJQUE1RCxDQUFMLEVBQXdFLE9BQU8sb0JBQVksZ0pBQVosRUFBOEpDLElBQTlKLEVBQW9LQyxHQUFwSyxDQUFQO0FBQ3hFLGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQVJTOztBQVNWRSxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0csV0FBTCxJQUFvQixPQUFPSCxJQUFJLENBQUNHLFdBQVosS0FBNEIsUUFBcEQsRUFBOEQsT0FBTyxvQkFBWSwr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QUksQ0FBQ0QsSUFBTCxLQUFjLGVBQWxCLEVBQW1DLE9BQU8sSUFBUDtBQUNuQyxZQUFJLENBQUNDLElBQUksQ0FBQ1MsZ0JBQVYsRUFBNEIsT0FBTyxvQkFBWSwrRUFBWixFQUE2RlQsSUFBN0YsRUFBbUdDLEdBQW5HLENBQVA7QUFDNUIsWUFBSSxPQUFPRCxJQUFJLENBQUNTLGdCQUFaLEtBQWlDLFFBQXJDLEVBQStDLE9BQU8sb0JBQVksb0ZBQVosRUFBa0dULElBQWxHLEVBQXdHQyxHQUF4RyxDQUFQO0FBQy9DLGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRDs7QUE3RFMsR0FEQztBQWdFYlMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZGLElBQUFBLEtBQUssRUFBRUc7QUFERztBQWhFQyxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uLy4uL2Vycm9yJztcblxuaW1wb3J0IE9wZW5BUElGbG93cyBmcm9tICcuL09wZW5BUElGbG93cyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHR5cGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUudHlwZSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgdHlwZSBmaWVsZCBpcyByZXF1aXJlZCBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS50eXBlICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgdHlwZSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKCFbJ2FwaUtleScsICdodHRwJywgJ29hdXRoMicsICdvcGVuSWRDb25uZWN0J10uaW5jbHVkZXMobm9kZS50eXBlKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgdHlwZSB2YWx1ZSBjYW4gb25seSBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZyBcImFwaUtleVwiLCBcImh0dHBcIiwgXCJvYXV0aDJcIiwgXCJvcGVuSWRDb25uZWN0XCIgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVzY3JpcHRpb24gZmllbGQgbXVzdCBiZSBhIHN0cmluZyBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnYXBpS2V5JykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5uYW1lICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgbmFtZSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgaW4oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnYXBpS2V5JykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICghbm9kZS5pbikgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgaW4gZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuaW4gIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBpbiBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKCFbJ3F1ZXJ5JywgJ2hlYWRlcicsICdjb29raWUnXS5pbmNsdWRlcyhub2RlLmluKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgaW4gdmFsdWUgY2FuIG9ubHkgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgXCJxdWVyeVwiLCBcImhlYWRlclwiIG9yIFwiY29va2llXCIgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzY2hlbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnaHR0cCcpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuc2NoZW1lKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzY2hlbWUgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuc2NoZW1lICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgc2NoZW1lIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBiZWFyZXJGb3JtYXQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnaHR0cCcpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuYmVhcmVyRm9ybWF0KSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBiZWFyZXJGb3JtYXQgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuc2NoZW1lICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgYmVhcmVyRm9ybWF0IGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBmbG93cygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnR5cGUgIT09ICdvYXV0aDInKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCFub2RlLmZsb3dzKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBmbG93cyBmaWVsZCBpcyByZXF1aXJlZCBmb3IgdGhlIE9wZW4gQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBvcGVuSWRDb25uZWN0VXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ29wZW5JZENvbm5lY3QnKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCFub2RlLm9wZW5JZENvbm5lY3RVcmwpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIG9wZW5JZENvbm5lY3RVcmwgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUub3BlbklkQ29ubmVjdFVybCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIG9wZW5JZENvbm5lY3RVcmwgZmllbGQgbXVzdCBiZSBhIHN0cmluZyBmb3IgdGhlIE9wZW5BUEkgU2VjdXJpdHkgU2NoZW1lIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgZmxvd3M6IE9wZW5BUElGbG93cyxcbiAgfSxcbn07XG4iXX0=