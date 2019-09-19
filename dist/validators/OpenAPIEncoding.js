"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _OpenAPIHeader = require("./OpenAPIHeader");

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// eslint-disable-next-line import/no-cycle
var _default = {
  validators: {
    contentType() {
      return (node, ctx) => {
        if (node && node.contentType && typeof node.contentType !== 'string') {
          return (0, _error.default)('The contentType field must be a string', node, ctx);
        }

        return null;
      };
    },

    style() {
      return (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return (0, _error.default)('The style field must be a string', node, ctx);
        }

        return null;
      };
    },

    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return (0, _error.default)('The explode field must be a boolean', node, ctx);
        }

        return null;
      };
    },

    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return (0, _error.default)('The allowReserved field must be a boolean', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    headers: _OpenAPIHeader.OpenAPIHeaderMap
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElFbmNvZGluZy5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0b3JzIiwiY29udGVudFR5cGUiLCJub2RlIiwiY3R4Iiwic3R5bGUiLCJleHBsb2RlIiwiYWxsb3dSZXNlcnZlZCIsInByb3BlcnRpZXMiLCJoZWFkZXJzIiwiT3BlbkFQSUhlYWRlck1hcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUNBOztBQUNBOzs7O0FBRkE7ZUFJZTtBQUNiQSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0QsV0FBYixJQUE0QixPQUFPQyxJQUFJLENBQUNELFdBQVosS0FBNEIsUUFBNUQsRUFBc0U7QUFDcEUsaUJBQU8sb0JBQVksd0NBQVosRUFBc0RDLElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1ELEtBUlM7O0FBU1ZDLElBQUFBLEtBQUssR0FBRztBQUNOLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLEtBQWIsSUFBc0IsT0FBT0YsSUFBSSxDQUFDRSxLQUFaLEtBQXNCLFFBQWhELEVBQTBEO0FBQ3hELGlCQUFPLG9CQUFZLGtDQUFaLEVBQWdERixJQUFoRCxFQUFzREMsR0FBdEQsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQWhCUzs7QUFpQlZFLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNHLE9BQWIsSUFBd0IsT0FBT0gsSUFBSSxDQUFDRyxPQUFaLEtBQXdCLFNBQXBELEVBQStEO0FBQzdELGlCQUFPLG9CQUFZLHFDQUFaLEVBQW1ESCxJQUFuRCxFQUF5REMsR0FBekQsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQXhCUzs7QUF5QlZHLElBQUFBLGFBQWEsR0FBRztBQUNkLGFBQU8sQ0FBQ0osSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNJLGFBQWIsSUFBOEIsT0FBT0osSUFBSSxDQUFDSSxhQUFaLEtBQThCLFNBQWhFLEVBQTJFO0FBQ3pFLGlCQUFPLG9CQUFZLDJDQUFaLEVBQXlESixJQUF6RCxFQUErREMsR0FBL0QsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRDs7QUFoQ1MsR0FEQztBQW1DYkksRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sRUFBRUM7QUFEQztBQW5DQyxDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGltcG9ydC9uby1jeWNsZVxuaW1wb3J0IHsgT3BlbkFQSUhlYWRlck1hcCB9IGZyb20gJy4vT3BlbkFQSUhlYWRlcic7XG5pbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBjb250ZW50VHlwZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuY29udGVudFR5cGUgJiYgdHlwZW9mIG5vZGUuY29udGVudFR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgY29udGVudFR5cGUgZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc3R5bGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnN0eWxlICYmIHR5cGVvZiBub2RlLnN0eWxlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHN0eWxlIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGV4cGxvZGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmV4cGxvZGUgJiYgdHlwZW9mIG5vZGUuZXhwbG9kZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZXhwbG9kZSBmaWVsZCBtdXN0IGJlIGEgYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYWxsb3dSZXNlcnZlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuYWxsb3dSZXNlcnZlZCAmJiB0eXBlb2Ygbm9kZS5hbGxvd1Jlc2VydmVkICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBhbGxvd1Jlc2VydmVkIGZpZWxkIG11c3QgYmUgYSBib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGhlYWRlcnM6IE9wZW5BUElIZWFkZXJNYXAsXG4gIH0sXG59O1xuIl19