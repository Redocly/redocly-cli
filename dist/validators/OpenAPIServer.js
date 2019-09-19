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
      return (node, ctx) => node && node.defaut && typeof node.default !== 'string' ? (0, _error.default)('default field of the Server Variable must be a string', node, ctx) : null;
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
        if (!node || !node.url || typeof node.url !== 'string') return (0, _error.default)('url is required for a server object and must be a string', node, ctx);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZXJ2ZXIuanMiXSwibmFtZXMiOlsiT3BlbkFQSVNlcnZlclZhcmlhYmxlIiwidmFsaWRhdG9ycyIsImRlZmF1bHQiLCJub2RlIiwiY3R4IiwiZGVmYXV0IiwiZGVzY3JpcHRpb24iLCJlbnVtIiwiQXJyYXkiLCJpc0FycmF5IiwidHlwZSIsImZpbHRlciIsIml0ZW0iLCJsZW5ndGgiLCJPcGVuQVBJU2VydmVyVmFyaWFibGVNYXAiLCJwcm9wZXJ0aWVzIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiLCJPcGVuQVBJU2VydmVyIiwidXJsIiwidmFyaWFibGVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7QUFFQSxNQUFNQSxxQkFBcUIsR0FBRztBQUM1QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWdCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsTUFBYixJQUF1QixPQUFPRixJQUFJLENBQUNELE9BQVosS0FBd0IsUUFBL0MsR0FDbkIsb0JBQVksdURBQVosRUFBcUVDLElBQXJFLEVBQTJFQyxHQUEzRSxDQURtQixHQUMrRCxJQUR0RjtBQUVELEtBSlM7O0FBS1ZFLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWdCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0csV0FBYixJQUE0QixPQUFPSCxJQUFJLENBQUNHLFdBQVosS0FBNEIsUUFBeEQsR0FDbkIsb0JBQVksa0VBQVosRUFBZ0ZILElBQWhGLEVBQXNGQyxHQUF0RixDQURtQixHQUMwRSxJQURqRztBQUVELEtBUlM7O0FBU1ZHLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0osSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNJLElBQWpCLEVBQXVCO0FBQ3JCLGNBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNOLElBQUksQ0FBQ0ksSUFBbkIsQ0FBTCxFQUErQixPQUFPLG9CQUFZLGdDQUFaLEVBQThDSixJQUE5QyxFQUFvREMsR0FBcEQsQ0FBUDtBQUMvQixjQUFJRCxJQUFJLENBQUNPLElBQUwsSUFBYVAsSUFBSSxDQUFDSSxJQUFMLENBQVVJLE1BQVYsQ0FBa0JDLElBQUQsSUFBVSxPQUFPQSxJQUFQLEtBQWdCLFFBQTNDLEVBQXFEQyxNQUFyRCxLQUFnRSxDQUFqRixFQUFvRixPQUFPLG9CQUFZLDRDQUFaLEVBQTBEVixJQUExRCxFQUFnRUMsR0FBaEUsQ0FBUDtBQUNyRjs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0Q7O0FBakJTO0FBRGdCLENBQTlCO0FBc0JBLE1BQU1VLHdCQUF3QixHQUFHO0FBQy9CQyxFQUFBQSxVQUFVLENBQUNaLElBQUQsRUFBTztBQUNmLFVBQU1hLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZZixJQUFaLEVBQWtCZ0IsT0FBbEIsQ0FBMkJDLENBQUQsSUFBTztBQUMvQkosTUFBQUEsS0FBSyxDQUFDSSxDQUFELENBQUwsR0FBV3BCLHFCQUFYO0FBQ0QsS0FGRDtBQUdBLFdBQU9nQixLQUFQO0FBQ0Q7O0FBUDhCLENBQWpDO0FBVUEsTUFBTUssYUFBYSxHQUFHO0FBQ3BCcEIsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZxQixJQUFBQSxHQUFHLEdBQUc7QUFDSixhQUFPLENBQUNuQixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNtQixHQUFmLElBQXNCLE9BQU9uQixJQUFJLENBQUNtQixHQUFaLEtBQW9CLFFBQTlDLEVBQXdELE9BQU8sb0JBQVksMERBQVosRUFBd0VuQixJQUF4RSxFQUE4RUMsR0FBOUUsQ0FBUDtBQUN4RCxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FOUzs7QUFPVkUsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRyxXQUFiLElBQTRCLE9BQU9ILElBQUksQ0FBQ0csV0FBWixLQUE0QixRQUF4RCxHQUNuQixvQkFBWSx5REFBWixFQUF1RUgsSUFBdkUsRUFBNkVDLEdBQTdFLENBRG1CLEdBQ2lFLElBRHhGO0FBRUQ7O0FBVlMsR0FEUTtBQWFwQlcsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZRLElBQUFBLFNBQVMsR0FBRztBQUNWLGFBQU9ULHdCQUFQO0FBQ0Q7O0FBSFM7QUFiUSxDQUF0QjtlQW9CZU8sYSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmNvbnN0IE9wZW5BUElTZXJ2ZXJWYXJpYWJsZSA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIGRlZmF1bHQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS5kZWZhdXQgJiYgdHlwZW9mIG5vZGUuZGVmYXVsdCAhPT0gJ3N0cmluZydcbiAgICAgICAgPyBjcmVhdGVFcnJvcignZGVmYXVsdCBmaWVsZCBvZiB0aGUgU2VydmVyIFZhcmlhYmxlIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycm9yKCdkZXNjcmlwdGlvbiBmaWVsZCBvZiB0aGUgU2VydmVyIFZhcmlhYmxlIG9iamVjdCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgZW51bSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZW51bSkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShub2RlLmVudW0pKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1ZhbHVlIG9mIGVudW0gbXVzdCBiZSBhbiBhcnJheScsIG5vZGUsIGN0eCk7XG4gICAgICAgICAgaWYgKG5vZGUudHlwZSAmJiBub2RlLmVudW0uZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSAhPT0gJ3N0cmluZycpLmxlbmd0aCAhPT0gMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdBbGwgdmFsdWVzIG9mIFwiZW51bVwiIGZpZWxkIG11c3QgYmUgc3RyaW5ncycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb25zdCBPcGVuQVBJU2VydmVyVmFyaWFibGVNYXAgPSB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJU2VydmVyVmFyaWFibGU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb3BzO1xuICB9LFxufTtcblxuY29uc3QgT3BlbkFQSVNlcnZlciA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS51cmwgfHwgdHlwZW9mIG5vZGUudXJsICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCd1cmwgaXMgcmVxdWlyZWQgZm9yIGEgc2VydmVyIG9iamVjdCBhbmQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IChub2RlICYmIG5vZGUuZGVzY3JpcHRpb24gJiYgdHlwZW9mIG5vZGUuZGVzY3JpcHRpb24gIT09ICdzdHJpbmcnXG4gICAgICAgID8gY3JlYXRlRXJyb3IoJ2Rlc2NyaXB0aW9uIGZpZWxkIG9mIHRoZSBTZXJ2ZXIgb2JqZWN0IG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIHZhcmlhYmxlcygpIHtcbiAgICAgIHJldHVybiBPcGVuQVBJU2VydmVyVmFyaWFibGVNYXA7XG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IE9wZW5BUElTZXJ2ZXI7XG4iXX0=