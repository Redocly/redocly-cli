"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIPaths = exports.OpenAPIPathItem = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPIOperation = _interopRequireDefault(require("./OpenAPIOperation"));

var _OpenAPIParameter = require("./OpenAPIParameter");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-cycle */
const OpenAPIPathItem = {
  validators: {
    summary() {
      return (node, ctx) => node && node.summary && typeof node.summary !== 'string' ? (0, _error.default)('summary of the Path Item must be a string', node, ctx) : null;
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.default)('description of the Path Item must be a string', node, ctx) : null;
    },

    servers() {
      return (node, ctx) => node && node.servers && !Array.isArray(node.servers) ? (0, _error.default)('servers of the Path Item must be an array', node, ctx) : null;
    },

    parameters() {
      return (node, ctx) => {
        if (!node || !node.parameters) return null;

        if (!Array.isArray(node.parameters)) {
          return (0, _error.default)('parameters of the Path Item must be an array', node, ctx);
        }

        if (new Set(node.parameters).size !== node.parameters.length) {
          return (0, _error.default)('parameters must be unique in the Path Item object', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    get: _OpenAPIOperation.default,
    put: _OpenAPIOperation.default,
    post: _OpenAPIOperation.default,
    delete: _OpenAPIOperation.default,
    options: _OpenAPIOperation.default,
    head: _OpenAPIOperation.default,
    patch: _OpenAPIOperation.default,
    trace: _OpenAPIOperation.default,
    servers: _OpenAPIServer.default,
    parameters: _OpenAPIParameter.OpenAPIParameter
  }
};
exports.OpenAPIPathItem = OpenAPIPathItem;
const OpenAPIPaths = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIPathItem;
    });
    return props;
  }

};
exports.OpenAPIPaths = OpenAPIPaths;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElQYXRocy5qcyJdLCJuYW1lcyI6WyJPcGVuQVBJUGF0aEl0ZW0iLCJ2YWxpZGF0b3JzIiwic3VtbWFyeSIsIm5vZGUiLCJjdHgiLCJkZXNjcmlwdGlvbiIsInNlcnZlcnMiLCJBcnJheSIsImlzQXJyYXkiLCJwYXJhbWV0ZXJzIiwiU2V0Iiwic2l6ZSIsImxlbmd0aCIsInByb3BlcnRpZXMiLCJnZXQiLCJPcGVuQVBJT3BlcmF0aW9uIiwicHV0IiwicG9zdCIsImRlbGV0ZSIsIm9wdGlvbnMiLCJoZWFkIiwicGF0Y2giLCJ0cmFjZSIsIk9wZW5BUElTZXJ2ZXIiLCJPcGVuQVBJUGFyYW1ldGVyIiwiT3BlbkFQSVBhdGhzIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7OztBQUxBO0FBT08sTUFBTUEsZUFBZSxHQUFHO0FBQzdCQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRCxPQUFiLElBQXdCLE9BQU9DLElBQUksQ0FBQ0QsT0FBWixLQUF3QixRQUFoRCxHQUNuQixvQkFBWSwyQ0FBWixFQUF5REMsSUFBekQsRUFBK0RDLEdBQS9ELENBRG1CLEdBQ21ELElBRDFFO0FBRUQsS0FKUzs7QUFLVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRSxXQUFiLElBQTRCLE9BQU9GLElBQUksQ0FBQ0UsV0FBWixLQUE0QixRQUF4RCxHQUNuQixvQkFBWSwrQ0FBWixFQUE2REYsSUFBN0QsRUFBbUVDLEdBQW5FLENBRG1CLEdBQ3VELElBRDlFO0FBRUQsS0FSUzs7QUFTVkUsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRyxPQUFiLElBQXdCLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjTCxJQUFJLENBQUNHLE9BQW5CLENBQXpCLEdBQ25CLG9CQUFZLDJDQUFaLEVBQXlESCxJQUF6RCxFQUErREMsR0FBL0QsQ0FEbUIsR0FDbUQsSUFEMUU7QUFFRCxLQVpTOztBQWFWSyxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNOLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ00sVUFBbkIsRUFBK0IsT0FBTyxJQUFQOztBQUMvQixZQUFJLENBQUNGLEtBQUssQ0FBQ0MsT0FBTixDQUFjTCxJQUFJLENBQUNNLFVBQW5CLENBQUwsRUFBcUM7QUFDbkMsaUJBQU8sb0JBQVksOENBQVosRUFBNEROLElBQTVELEVBQWtFQyxHQUFsRSxDQUFQO0FBQ0Q7O0FBQ0QsWUFBSyxJQUFJTSxHQUFKLENBQVFQLElBQUksQ0FBQ00sVUFBYixDQUFELENBQTJCRSxJQUEzQixLQUFvQ1IsSUFBSSxDQUFDTSxVQUFMLENBQWdCRyxNQUF4RCxFQUFnRTtBQUM5RCxpQkFBTyxvQkFBWSxtREFBWixFQUFpRVQsSUFBakUsRUFBdUVDLEdBQXZFLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQVREO0FBVUQ7O0FBeEJTLEdBRGlCO0FBNEI3QlMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLEdBQUcsRUFBRUMseUJBREs7QUFFVkMsSUFBQUEsR0FBRyxFQUFFRCx5QkFGSztBQUdWRSxJQUFBQSxJQUFJLEVBQUVGLHlCQUhJO0FBSVZHLElBQUFBLE1BQU0sRUFBRUgseUJBSkU7QUFLVkksSUFBQUEsT0FBTyxFQUFFSix5QkFMQztBQU1WSyxJQUFBQSxJQUFJLEVBQUVMLHlCQU5JO0FBT1ZNLElBQUFBLEtBQUssRUFBRU4seUJBUEc7QUFRVk8sSUFBQUEsS0FBSyxFQUFFUCx5QkFSRztBQVNWVCxJQUFBQSxPQUFPLEVBQUVpQixzQkFUQztBQVVWZCxJQUFBQSxVQUFVLEVBQUVlO0FBVkY7QUE1QmlCLENBQXhCOztBQTBDQSxNQUFNQyxZQUFZLEdBQUc7QUFDMUJaLEVBQUFBLFVBQVUsQ0FBQ1YsSUFBRCxFQUFPO0FBQ2YsVUFBTXVCLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZekIsSUFBWixFQUFrQjBCLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVc5QixlQUFYO0FBQ0QsS0FGRDtBQUdBLFdBQU8wQixLQUFQO0FBQ0Q7O0FBUHlCLENBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWN5Y2xlICovXG5pbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5pbXBvcnQgT3BlbkFQSVNlcnZlciBmcm9tICcuL09wZW5BUElTZXJ2ZXInO1xuaW1wb3J0IE9wZW5BUElPcGVyYXRpb24gZnJvbSAnLi9PcGVuQVBJT3BlcmF0aW9uJztcbmltcG9ydCB7IE9wZW5BUElQYXJhbWV0ZXIgfSBmcm9tICcuL09wZW5BUElQYXJhbWV0ZXInO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSVBhdGhJdGVtID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgc3VtbWFyeSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLnN1bW1hcnkgJiYgdHlwZW9mIG5vZGUuc3VtbWFyeSAhPT0gJ3N0cmluZydcbiAgICAgICAgPyBjcmVhdGVFcnJvcignc3VtbWFyeSBvZiB0aGUgUGF0aCBJdGVtIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycm9yKCdkZXNjcmlwdGlvbiBvZiB0aGUgUGF0aCBJdGVtIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBzZXJ2ZXJzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IChub2RlICYmIG5vZGUuc2VydmVycyAmJiAhQXJyYXkuaXNBcnJheShub2RlLnNlcnZlcnMpXG4gICAgICAgID8gY3JlYXRlRXJyb3IoJ3NlcnZlcnMgb2YgdGhlIFBhdGggSXRlbSBtdXN0IGJlIGFuIGFycmF5Jywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgcGFyYW1ldGVycygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS5wYXJhbWV0ZXJzKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG5vZGUucGFyYW1ldGVycykpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ3BhcmFtZXRlcnMgb2YgdGhlIFBhdGggSXRlbSBtdXN0IGJlIGFuIGFycmF5Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKG5ldyBTZXQobm9kZS5wYXJhbWV0ZXJzKSkuc2l6ZSAhPT0gbm9kZS5wYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcigncGFyYW1ldGVycyBtdXN0IGJlIHVuaXF1ZSBpbiB0aGUgUGF0aCBJdGVtIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG5cbiAgcHJvcGVydGllczoge1xuICAgIGdldDogT3BlbkFQSU9wZXJhdGlvbixcbiAgICBwdXQ6IE9wZW5BUElPcGVyYXRpb24sXG4gICAgcG9zdDogT3BlbkFQSU9wZXJhdGlvbixcbiAgICBkZWxldGU6IE9wZW5BUElPcGVyYXRpb24sXG4gICAgb3B0aW9uczogT3BlbkFQSU9wZXJhdGlvbixcbiAgICBoZWFkOiBPcGVuQVBJT3BlcmF0aW9uLFxuICAgIHBhdGNoOiBPcGVuQVBJT3BlcmF0aW9uLFxuICAgIHRyYWNlOiBPcGVuQVBJT3BlcmF0aW9uLFxuICAgIHNlcnZlcnM6IE9wZW5BUElTZXJ2ZXIsXG4gICAgcGFyYW1ldGVyczogT3BlbkFQSVBhcmFtZXRlcixcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJUGF0aHMgPSB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJUGF0aEl0ZW07XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb3BzO1xuICB9LFxufTtcbiJdfQ==