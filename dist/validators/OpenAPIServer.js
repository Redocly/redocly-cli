"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIServerVariable = {
  validators: {
    default() {
      return (node, ctx) => {
        if (!node || !node.default) return (0, _error.default)('The default field is required for the Server Variable', node, ctx, 'key');
        if (typeof node.default !== 'string') return (0, _error.default)('default field of the Server Variable must be a string', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.default)('description field of the Server Variable object must be a string', node, ctx) : null;
    },

    enum() {
      return (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return (0, _error.default)('Value of enum must be an array', node, ctx);
          if (node.type && node.enum.filter(item => typeof item !== 'string').length !== 0) return (0, _error.default)('All values of "enum" field must be strings', node, ctx);
        }

        return null;
      };
    }

  }
};
const OpenAPIServerVariableMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIServerVariable;
    });
    return props;
  }

};
const OpenAPIServer = {
  validators: {
    url() {
      return (node, ctx) => {
        if (!node || !node.url || typeof node.url !== 'string') return (0, _error.default)('url is required for a server object and must be a string', node, ctx, 'key');
        return null;
      };
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.default)('description field of the Server object must be a string', node, ctx) : null;
    }

  },
  properties: {
    variables() {
      return OpenAPIServerVariableMap;
    }

  }
};
var _default = OpenAPIServer;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZXJ2ZXIuanMiXSwibmFtZXMiOlsiT3BlbkFQSVNlcnZlclZhcmlhYmxlIiwidmFsaWRhdG9ycyIsImRlZmF1bHQiLCJub2RlIiwiY3R4IiwiZGVzY3JpcHRpb24iLCJlbnVtIiwiQXJyYXkiLCJpc0FycmF5IiwidHlwZSIsImZpbHRlciIsIml0ZW0iLCJsZW5ndGgiLCJPcGVuQVBJU2VydmVyVmFyaWFibGVNYXAiLCJwcm9wZXJ0aWVzIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiLCJPcGVuQVBJU2VydmVyIiwidXJsIiwidmFyaWFibGVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7QUFFQSxNQUFNQSxxQkFBcUIsR0FBRztBQUM1QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRCxPQUFuQixFQUE0QixPQUFPLG9CQUFZLHVEQUFaLEVBQXFFQyxJQUFyRSxFQUEyRUMsR0FBM0UsRUFBZ0YsS0FBaEYsQ0FBUDtBQUM1QixZQUFJLE9BQU9ELElBQUksQ0FBQ0QsT0FBWixLQUF3QixRQUE1QixFQUFzQyxPQUFPLG9CQUFZLHVEQUFaLEVBQXFFQyxJQUFyRSxFQUEyRUMsR0FBM0UsQ0FBUDtBQUN0QyxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0QsS0FQUzs7QUFRVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRSxXQUFiLElBQTRCLE9BQU9GLElBQUksQ0FBQ0UsV0FBWixLQUE0QixRQUF4RCxHQUNuQixvQkFBWSxrRUFBWixFQUFnRkYsSUFBaEYsRUFBc0ZDLEdBQXRGLENBRG1CLEdBQzBFLElBRGpHO0FBRUQsS0FYUzs7QUFZVkUsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0csSUFBakIsRUFBdUI7QUFDckIsY0FBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0wsSUFBSSxDQUFDRyxJQUFuQixDQUFMLEVBQStCLE9BQU8sb0JBQVksZ0NBQVosRUFBOENILElBQTlDLEVBQW9EQyxHQUFwRCxDQUFQO0FBQy9CLGNBQUlELElBQUksQ0FBQ00sSUFBTCxJQUFhTixJQUFJLENBQUNHLElBQUwsQ0FBVUksTUFBVixDQUFrQkMsSUFBRCxJQUFVLE9BQU9BLElBQVAsS0FBZ0IsUUFBM0MsRUFBcURDLE1BQXJELEtBQWdFLENBQWpGLEVBQW9GLE9BQU8sb0JBQVksNENBQVosRUFBMERULElBQTFELEVBQWdFQyxHQUFoRSxDQUFQO0FBQ3JGOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTkQ7QUFPRDs7QUFwQlM7QUFEZ0IsQ0FBOUI7QUF5QkEsTUFBTVMsd0JBQXdCLEdBQUc7QUFDL0JDLEVBQUFBLFVBQVUsQ0FBQ1gsSUFBRCxFQUFPO0FBQ2YsVUFBTVksS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlkLElBQVosRUFBa0JlLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVduQixxQkFBWDtBQUNELEtBRkQ7QUFHQSxXQUFPZSxLQUFQO0FBQ0Q7O0FBUDhCLENBQWpDO0FBVUEsTUFBTUssYUFBYSxHQUFHO0FBQ3BCbkIsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZvQixJQUFBQSxHQUFHLEdBQUc7QUFDSixhQUFPLENBQUNsQixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNrQixHQUFmLElBQXNCLE9BQU9sQixJQUFJLENBQUNrQixHQUFaLEtBQW9CLFFBQTlDLEVBQXdELE9BQU8sb0JBQVksMERBQVosRUFBd0VsQixJQUF4RSxFQUE4RUMsR0FBOUUsRUFBbUYsS0FBbkYsQ0FBUDtBQUN4RCxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FOUzs7QUFPVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRSxXQUFiLElBQTRCLE9BQU9GLElBQUksQ0FBQ0UsV0FBWixLQUE0QixRQUF4RCxHQUNuQixvQkFBWSx5REFBWixFQUF1RUYsSUFBdkUsRUFBNkVDLEdBQTdFLENBRG1CLEdBQ2lFLElBRHhGO0FBRUQ7O0FBVlMsR0FEUTtBQWFwQlUsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZRLElBQUFBLFNBQVMsR0FBRztBQUNWLGFBQU9ULHdCQUFQO0FBQ0Q7O0FBSFM7QUFiUSxDQUF0QjtlQW9CZU8sYSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmNvbnN0IE9wZW5BUElTZXJ2ZXJWYXJpYWJsZSA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIGRlZmF1bHQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUgfHwgIW5vZGUuZGVmYXVsdCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVmYXVsdCBmaWVsZCBpcyByZXF1aXJlZCBmb3IgdGhlIFNlcnZlciBWYXJpYWJsZScsIG5vZGUsIGN0eCwgJ2tleScpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuZGVmYXVsdCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignZGVmYXVsdCBmaWVsZCBvZiB0aGUgU2VydmVyIFZhcmlhYmxlIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycm9yKCdkZXNjcmlwdGlvbiBmaWVsZCBvZiB0aGUgU2VydmVyIFZhcmlhYmxlIG9iamVjdCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgZW51bSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZW51bSkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShub2RlLmVudW0pKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1ZhbHVlIG9mIGVudW0gbXVzdCBiZSBhbiBhcnJheScsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgaWYgKG5vZGUudHlwZSAmJiBub2RlLmVudW0uZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSAhPT0gJ3N0cmluZycpLmxlbmd0aCAhPT0gMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdBbGwgdmFsdWVzIG9mIFwiZW51bVwiIGZpZWxkIG11c3QgYmUgc3RyaW5ncycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb25zdCBPcGVuQVBJU2VydmVyVmFyaWFibGVNYXAgPSB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJU2VydmVyVmFyaWFibGU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb3BzO1xuICB9LFxufTtcblxuY29uc3QgT3BlbkFQSVNlcnZlciA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS51cmwgfHwgdHlwZW9mIG5vZGUudXJsICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCd1cmwgaXMgcmVxdWlyZWQgZm9yIGEgc2VydmVyIG9iamVjdCBhbmQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCwgJ2tleScpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycm9yKCdkZXNjcmlwdGlvbiBmaWVsZCBvZiB0aGUgU2VydmVyIG9iamVjdCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICB2YXJpYWJsZXMoKSB7XG4gICAgICByZXR1cm4gT3BlbkFQSVNlcnZlclZhcmlhYmxlTWFwO1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBPcGVuQVBJU2VydmVyO1xuIl19