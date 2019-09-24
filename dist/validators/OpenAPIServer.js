"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireWildcard(require("../error"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const OpenAPIServerVariable = {
  validators: {
    default() {
      return (node, ctx) => {
        if (!node || !node.default) return (0, _error.createErrorMissingRequiredField)('default', node, ctx, 'key');
        if (typeof node.default !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    enum() {
      return (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return (0, _error.createErrrorFieldTypeMismatch)('array', node, ctx);
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
        if (!node || !node.url || typeof node.url !== 'string') return (0, _error.createErrorMissingRequiredField)('url', node, ctx);
        if (typeof node.url !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZXJ2ZXIuanMiXSwibmFtZXMiOlsiT3BlbkFQSVNlcnZlclZhcmlhYmxlIiwidmFsaWRhdG9ycyIsImRlZmF1bHQiLCJub2RlIiwiY3R4IiwiZGVzY3JpcHRpb24iLCJlbnVtIiwiQXJyYXkiLCJpc0FycmF5IiwidHlwZSIsImZpbHRlciIsIml0ZW0iLCJsZW5ndGgiLCJPcGVuQVBJU2VydmVyVmFyaWFibGVNYXAiLCJwcm9wZXJ0aWVzIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiLCJPcGVuQVBJU2VydmVyIiwidXJsIiwidmFyaWFibGVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7OztBQUVBLE1BQU1BLHFCQUFxQixHQUFHO0FBQzVCQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNELE9BQW5CLEVBQTRCLE9BQU8sNENBQWdDLFNBQWhDLEVBQTJDQyxJQUEzQyxFQUFpREMsR0FBakQsRUFBc0QsS0FBdEQsQ0FBUDtBQUM1QixZQUFJLE9BQU9ELElBQUksQ0FBQ0QsT0FBWixLQUF3QixRQUE1QixFQUFzQyxPQUFPLDBDQUE4QixRQUE5QixFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDdEMsZUFBTyxJQUFQO0FBQ0QsT0FKRDtBQUtELEtBUFM7O0FBUVZDLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWdCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsV0FBYixJQUE0QixPQUFPRixJQUFJLENBQUNFLFdBQVosS0FBNEIsUUFBeEQsR0FDbkIsMENBQThCLFFBQTlCLEVBQXdDRixJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FEbUIsR0FDa0MsSUFEekQ7QUFFRCxLQVhTOztBQVlWRSxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRyxJQUFqQixFQUF1QjtBQUNyQixjQUFJLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjTCxJQUFJLENBQUNHLElBQW5CLENBQUwsRUFBK0IsT0FBTywwQ0FBOEIsT0FBOUIsRUFBdUNILElBQXZDLEVBQTZDQyxHQUE3QyxDQUFQO0FBQy9CLGNBQUlELElBQUksQ0FBQ00sSUFBTCxJQUFhTixJQUFJLENBQUNHLElBQUwsQ0FBVUksTUFBVixDQUFrQkMsSUFBRCxJQUFVLE9BQU9BLElBQVAsS0FBZ0IsUUFBM0MsRUFBcURDLE1BQXJELEtBQWdFLENBQWpGLEVBQW9GLE9BQU8sb0JBQVksNENBQVosRUFBMERULElBQTFELEVBQWdFQyxHQUFoRSxDQUFQO0FBQ3JGOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTkQ7QUFPRDs7QUFwQlM7QUFEZ0IsQ0FBOUI7QUF5QkEsTUFBTVMsd0JBQXdCLEdBQUc7QUFDL0JDLEVBQUFBLFVBQVUsQ0FBQ1gsSUFBRCxFQUFPO0FBQ2YsVUFBTVksS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlkLElBQVosRUFBa0JlLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVduQixxQkFBWDtBQUNELEtBRkQ7QUFHQSxXQUFPZSxLQUFQO0FBQ0Q7O0FBUDhCLENBQWpDO0FBVUEsTUFBTUssYUFBYSxHQUFHO0FBQ3BCbkIsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZvQixJQUFBQSxHQUFHLEdBQUc7QUFDSixhQUFPLENBQUNsQixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNrQixHQUFmLElBQXNCLE9BQU9sQixJQUFJLENBQUNrQixHQUFaLEtBQW9CLFFBQTlDLEVBQXdELE9BQU8sNENBQWdDLEtBQWhDLEVBQXVDbEIsSUFBdkMsRUFBNkNDLEdBQTdDLENBQVA7QUFDeEQsWUFBSSxPQUFPRCxJQUFJLENBQUNrQixHQUFaLEtBQW9CLFFBQXhCLEVBQWtDLE9BQU8sMENBQThCLFFBQTlCLEVBQXdDbEIsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDbEMsZUFBTyxJQUFQO0FBQ0QsT0FKRDtBQUtELEtBUFM7O0FBUVZDLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWdCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsV0FBYixJQUE0QixPQUFPRixJQUFJLENBQUNFLFdBQVosS0FBNEIsUUFBeEQsR0FDbkIsMENBQThCLFFBQTlCLEVBQXdDRixJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FEbUIsR0FDa0MsSUFEekQ7QUFFRDs7QUFYUyxHQURRO0FBY3BCVSxFQUFBQSxVQUFVLEVBQUU7QUFDVlEsSUFBQUEsU0FBUyxHQUFHO0FBQ1YsYUFBT1Qsd0JBQVA7QUFDRDs7QUFIUztBQWRRLENBQXRCO2VBcUJlTyxhIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yLCB7IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoLCBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkIH0gZnJvbSAnLi4vZXJyb3InO1xuXG5jb25zdCBPcGVuQVBJU2VydmVyVmFyaWFibGUgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLmRlZmF1bHQpIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCdkZWZhdWx0Jywgbm9kZSwgY3R4LCAna2V5Jyk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5kZWZhdWx0ICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBlbnVtKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5lbnVtKSB7XG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG5vZGUuZW51bSkpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnYXJyYXknLCBub2RlLCBjdHgpO1xuICAgICAgICAgIGlmIChub2RlLnR5cGUgJiYgbm9kZS5lbnVtLmZpbHRlcigoaXRlbSkgPT4gdHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKS5sZW5ndGggIT09IDApIHJldHVybiBjcmVhdGVFcnJvcignQWxsIHZhbHVlcyBvZiBcImVudW1cIiBmaWVsZCBtdXN0IGJlIHN0cmluZ3MnLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxufTtcblxuY29uc3QgT3BlbkFQSVNlcnZlclZhcmlhYmxlTWFwID0ge1xuICBwcm9wZXJ0aWVzKG5vZGUpIHtcbiAgICBjb25zdCBwcm9wcyA9IHt9O1xuICAgIE9iamVjdC5rZXlzKG5vZGUpLmZvckVhY2goKGspID0+IHtcbiAgICAgIHByb3BzW2tdID0gT3BlbkFQSVNlcnZlclZhcmlhYmxlO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9wcztcbiAgfSxcbn07XG5cbmNvbnN0IE9wZW5BUElTZXJ2ZXIgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICB1cmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUgfHwgIW5vZGUudXJsIHx8IHR5cGVvZiBub2RlLnVybCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCd1cmwnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUudXJsICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJ1xuICAgICAgICA/IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIHZhcmlhYmxlcygpIHtcbiAgICAgIHJldHVybiBPcGVuQVBJU2VydmVyVmFyaWFibGVNYXA7XG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IE9wZW5BUElTZXJ2ZXI7XG4iXX0=