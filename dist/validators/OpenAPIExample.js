"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIExampleMap = exports.OpenAPIExample = void 0;

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIExample = {
  validators: {
    value() {
      return (node, ctx) => {
        if (node.value && node.externalValue) {
          return (0, _error.default)('The value field and externalValue field are mutually exclusive.', node, ctx);
        }

        return null;
      };
    },

    externalValue() {
      return (node, ctx) => {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return (0, _error.default)('The externalValue field must be a string', node, ctx);
        }

        if (node.value && node.externalValue) {
          return (0, _error.default)('The value field and externalValue field are mutually exclusive.', node, ctx);
        }

        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') {
          return (0, _error.default)('The description field must be a string', node, ctx);
        }

        return null;
      };
    },

    summary() {
      return (node, ctx) => {
        if (node.summary && typeof node.summary !== 'string') {
          return (0, _error.default)('The summary field must be a string', node, ctx);
        }

        return null;
      };
    }

  }
};
exports.OpenAPIExample = OpenAPIExample;
const OpenAPIExampleMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIExample;
    });
    return props;
  }

};
exports.OpenAPIExampleMap = OpenAPIExampleMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElFeGFtcGxlLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElFeGFtcGxlIiwidmFsaWRhdG9ycyIsInZhbHVlIiwibm9kZSIsImN0eCIsImV4dGVybmFsVmFsdWUiLCJkZXNjcmlwdGlvbiIsInN1bW1hcnkiLCJPcGVuQVBJRXhhbXBsZU1hcCIsInByb3BlcnRpZXMiLCJwcm9wcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7O0FBRU8sTUFBTUEsY0FBYyxHQUFHO0FBQzVCQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNELEtBQUwsSUFBY0MsSUFBSSxDQUFDRSxhQUF2QixFQUFzQztBQUNwQyxpQkFBTyxvQkFBWSxpRUFBWixFQUErRUYsSUFBL0UsRUFBcUZDLEdBQXJGLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0FSUzs7QUFTVkMsSUFBQUEsYUFBYSxHQUFHO0FBQ2QsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNFLGFBQUwsSUFBc0IsT0FBT0YsSUFBSSxDQUFDRSxhQUFaLEtBQThCLFFBQXhELEVBQWtFO0FBQ2hFLGlCQUFPLG9CQUFZLDBDQUFaLEVBQXdERixJQUF4RCxFQUE4REMsR0FBOUQsQ0FBUDtBQUNEOztBQUNELFlBQUlELElBQUksQ0FBQ0QsS0FBTCxJQUFjQyxJQUFJLENBQUNFLGFBQXZCLEVBQXNDO0FBQ3BDLGlCQUFPLG9CQUFZLGlFQUFaLEVBQStFRixJQUEvRSxFQUFxRkMsR0FBckYsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BUkQ7QUFTRCxLQW5CUzs7QUFvQlZFLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDRyxXQUFMLElBQW9CLE9BQU9ILElBQUksQ0FBQ0csV0FBWixLQUE0QixRQUFwRCxFQUE4RDtBQUM1RCxpQkFBTyxvQkFBWSx3Q0FBWixFQUFzREgsSUFBdEQsRUFBNERDLEdBQTVELENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0EzQlM7O0FBNEJWRyxJQUFBQSxPQUFPLEdBQUc7QUFDUixhQUFPLENBQUNKLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0ksT0FBTCxJQUFnQixPQUFPSixJQUFJLENBQUNJLE9BQVosS0FBd0IsUUFBNUMsRUFBc0Q7QUFDcEQsaUJBQU8sb0JBQVksb0NBQVosRUFBa0RKLElBQWxELEVBQXdEQyxHQUF4RCxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1EOztBQW5DUztBQURnQixDQUF2Qjs7QUF3Q0EsTUFBTUksaUJBQWlCLEdBQUc7QUFDL0JDLEVBQUFBLFVBQVUsQ0FBQ04sSUFBRCxFQUFPO0FBQ2YsVUFBTU8sS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlULElBQVosRUFBa0JVLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVdkLGNBQVg7QUFDRCxLQUZEO0FBR0EsV0FBT1UsS0FBUDtBQUNEOztBQVA4QixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJRXhhbXBsZSA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHZhbHVlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudmFsdWUgJiYgbm9kZS5leHRlcm5hbFZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgdmFsdWUgZmllbGQgYW5kIGV4dGVybmFsVmFsdWUgZmllbGQgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZS4nLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGV4dGVybmFsVmFsdWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5leHRlcm5hbFZhbHVlICYmIHR5cGVvZiBub2RlLmV4dGVybmFsVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZXh0ZXJuYWxWYWx1ZSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS52YWx1ZSAmJiBub2RlLmV4dGVybmFsVmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB2YWx1ZSBmaWVsZCBhbmQgZXh0ZXJuYWxWYWx1ZSBmaWVsZCBhcmUgbXV0dWFsbHkgZXhjbHVzaXZlLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBkZXNjcmlwdGlvbiBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzdW1tYXJ5KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuc3VtbWFyeSAmJiB0eXBlb2Ygbm9kZS5zdW1tYXJ5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHN1bW1hcnkgZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUV4YW1wbGVNYXAgPSB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJRXhhbXBsZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19