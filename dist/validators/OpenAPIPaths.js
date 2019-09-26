"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIPaths = exports.OpenAPIPathItem = void 0;

var _error = _interopRequireWildcard(require("../error"));

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPIOperation = _interopRequireDefault(require("./OpenAPIOperation"));

var _OpenAPIParameter = require("./OpenAPIParameter");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/* eslint-disable import/no-cycle */
const OpenAPIPathItem = {
  validators: {
    summary() {
      return (node, ctx) => node && node.summary && typeof node.summary !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    servers() {
      return (node, ctx) => node && node.servers && !Array.isArray(node.servers) ? (0, _error.createErrrorFieldTypeMismatch)('array', node, ctx) : null;
    },

    parameters() {
      return (node, ctx) => {
        if (!node || !node.parameters) return null;

        if (!Array.isArray(node.parameters)) {
          return (0, _error.createErrrorFieldTypeMismatch)('array', node, ctx);
        }

        if (new Set(node.parameters).size !== node.parameters.length) {
          return (0, _error.default)('parameters must be unique in the Path Item object', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    parameters: _OpenAPIParameter.OpenAPIParameter,
    get: _OpenAPIOperation.default,
    put: _OpenAPIOperation.default,
    post: _OpenAPIOperation.default,
    delete: _OpenAPIOperation.default,
    options: _OpenAPIOperation.default,
    head: _OpenAPIOperation.default,
    patch: _OpenAPIOperation.default,
    trace: _OpenAPIOperation.default,
    servers: _OpenAPIServer.default
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElQYXRocy5qcyJdLCJuYW1lcyI6WyJPcGVuQVBJUGF0aEl0ZW0iLCJ2YWxpZGF0b3JzIiwic3VtbWFyeSIsIm5vZGUiLCJjdHgiLCJkZXNjcmlwdGlvbiIsInNlcnZlcnMiLCJBcnJheSIsImlzQXJyYXkiLCJwYXJhbWV0ZXJzIiwiU2V0Iiwic2l6ZSIsImxlbmd0aCIsInByb3BlcnRpZXMiLCJPcGVuQVBJUGFyYW1ldGVyIiwiZ2V0IiwiT3BlbkFQSU9wZXJhdGlvbiIsInB1dCIsInBvc3QiLCJkZWxldGUiLCJvcHRpb25zIiwiaGVhZCIsInBhdGNoIiwidHJhY2UiLCJPcGVuQVBJU2VydmVyIiwiT3BlbkFQSVBhdGhzIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFMQTtBQU9PLE1BQU1BLGVBQWUsR0FBRztBQUM3QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWdCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0QsT0FBYixJQUF3QixPQUFPQyxJQUFJLENBQUNELE9BQVosS0FBd0IsUUFBaEQsR0FDbkIsMENBQThCLFFBQTlCLEVBQXdDQyxJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FEbUIsR0FDa0MsSUFEekQ7QUFFRCxLQUpTOztBQUtWQyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNGLElBQUQsRUFBT0MsR0FBUCxLQUFnQkQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLFdBQWIsSUFBNEIsT0FBT0YsSUFBSSxDQUFDRSxXQUFaLEtBQTRCLFFBQXhELEdBQ25CLDBDQUE4QixRQUE5QixFQUF3Q0YsSUFBeEMsRUFBOENDLEdBQTlDLENBRG1CLEdBQ2tDLElBRHpEO0FBRUQsS0FSUzs7QUFTVkUsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRyxPQUFiLElBQXdCLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjTCxJQUFJLENBQUNHLE9BQW5CLENBQXpCLEdBQ25CLDBDQUE4QixPQUE5QixFQUF1Q0gsSUFBdkMsRUFBNkNDLEdBQTdDLENBRG1CLEdBQ2lDLElBRHhEO0FBRUQsS0FaUzs7QUFhVkssSUFBQUEsVUFBVSxHQUFHO0FBQ1gsYUFBTyxDQUFDTixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNNLFVBQW5CLEVBQStCLE9BQU8sSUFBUDs7QUFDL0IsWUFBSSxDQUFDRixLQUFLLENBQUNDLE9BQU4sQ0FBY0wsSUFBSSxDQUFDTSxVQUFuQixDQUFMLEVBQXFDO0FBQ25DLGlCQUFPLDBDQUE4QixPQUE5QixFQUF1Q04sSUFBdkMsRUFBNkNDLEdBQTdDLENBQVA7QUFDRDs7QUFDRCxZQUFLLElBQUlNLEdBQUosQ0FBUVAsSUFBSSxDQUFDTSxVQUFiLENBQUQsQ0FBMkJFLElBQTNCLEtBQW9DUixJQUFJLENBQUNNLFVBQUwsQ0FBZ0JHLE1BQXhELEVBQWdFO0FBQzlELGlCQUFPLG9CQUFZLG1EQUFaLEVBQWlFVCxJQUFqRSxFQUF1RUMsR0FBdkUsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BVEQ7QUFVRDs7QUF4QlMsR0FEaUI7QUE0QjdCUyxFQUFBQSxVQUFVLEVBQUU7QUFDVkosSUFBQUEsVUFBVSxFQUFFSyxrQ0FERjtBQUVWQyxJQUFBQSxHQUFHLEVBQUVDLHlCQUZLO0FBR1ZDLElBQUFBLEdBQUcsRUFBRUQseUJBSEs7QUFJVkUsSUFBQUEsSUFBSSxFQUFFRix5QkFKSTtBQUtWRyxJQUFBQSxNQUFNLEVBQUVILHlCQUxFO0FBTVZJLElBQUFBLE9BQU8sRUFBRUoseUJBTkM7QUFPVkssSUFBQUEsSUFBSSxFQUFFTCx5QkFQSTtBQVFWTSxJQUFBQSxLQUFLLEVBQUVOLHlCQVJHO0FBU1ZPLElBQUFBLEtBQUssRUFBRVAseUJBVEc7QUFVVlYsSUFBQUEsT0FBTyxFQUFFa0I7QUFWQztBQTVCaUIsQ0FBeEI7O0FBMENBLE1BQU1DLFlBQVksR0FBRztBQUMxQlosRUFBQUEsVUFBVSxDQUFDVixJQUFELEVBQU87QUFDZixVQUFNdUIsS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVl6QixJQUFaLEVBQWtCMEIsT0FBbEIsQ0FBMkJDLENBQUQsSUFBTztBQUMvQkosTUFBQUEsS0FBSyxDQUFDSSxDQUFELENBQUwsR0FBVzlCLGVBQVg7QUFDRCxLQUZEO0FBR0EsV0FBTzBCLEtBQVA7QUFDRDs7QUFQeUIsQ0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8tY3ljbGUgKi9cbmltcG9ydCBjcmVhdGVFcnJvciwgeyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCB9IGZyb20gJy4uL2Vycm9yJztcblxuaW1wb3J0IE9wZW5BUElTZXJ2ZXIgZnJvbSAnLi9PcGVuQVBJU2VydmVyJztcbmltcG9ydCBPcGVuQVBJT3BlcmF0aW9uIGZyb20gJy4vT3BlbkFQSU9wZXJhdGlvbic7XG5pbXBvcnQgeyBPcGVuQVBJUGFyYW1ldGVyIH0gZnJvbSAnLi9PcGVuQVBJUGFyYW1ldGVyJztcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElQYXRoSXRlbSA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHN1bW1hcnkoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS5zdW1tYXJ5ICYmIHR5cGVvZiBub2RlLnN1bW1hcnkgIT09ICdzdHJpbmcnXG4gICAgICAgID8gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IChub2RlICYmIG5vZGUuZGVzY3JpcHRpb24gJiYgdHlwZW9mIG5vZGUuZGVzY3JpcHRpb24gIT09ICdzdHJpbmcnXG4gICAgICAgID8gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIHNlcnZlcnMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS5zZXJ2ZXJzICYmICFBcnJheS5pc0FycmF5KG5vZGUuc2VydmVycylcbiAgICAgICAgPyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYXJyYXknLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBwYXJhbWV0ZXJzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLnBhcmFtZXRlcnMpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobm9kZS5wYXJhbWV0ZXJzKSkge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYXJyYXknLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgobmV3IFNldChub2RlLnBhcmFtZXRlcnMpKS5zaXplICE9PSBub2RlLnBhcmFtZXRlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdwYXJhbWV0ZXJzIG11c3QgYmUgdW5pcXVlIGluIHRoZSBQYXRoIEl0ZW0gb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcblxuICBwcm9wZXJ0aWVzOiB7XG4gICAgcGFyYW1ldGVyczogT3BlbkFQSVBhcmFtZXRlcixcbiAgICBnZXQ6IE9wZW5BUElPcGVyYXRpb24sXG4gICAgcHV0OiBPcGVuQVBJT3BlcmF0aW9uLFxuICAgIHBvc3Q6IE9wZW5BUElPcGVyYXRpb24sXG4gICAgZGVsZXRlOiBPcGVuQVBJT3BlcmF0aW9uLFxuICAgIG9wdGlvbnM6IE9wZW5BUElPcGVyYXRpb24sXG4gICAgaGVhZDogT3BlbkFQSU9wZXJhdGlvbixcbiAgICBwYXRjaDogT3BlbkFQSU9wZXJhdGlvbixcbiAgICB0cmFjZTogT3BlbkFQSU9wZXJhdGlvbixcbiAgICBzZXJ2ZXJzOiBPcGVuQVBJU2VydmVyLFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElQYXRocyA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElQYXRoSXRlbTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19