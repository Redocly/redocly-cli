"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    propertyName() {
      return (node, ctx) => {
        if (!(node && node.propertyName)) return (0, _error.default)('propertyName field is required for Discriminator object', node, ctx);
        if (typeof node.propertyName !== 'string') return (0, _error.default)('propertyName of the Discriminator must be a string', node, ctx);
        return null;
      };
    },

    mapping() {
      return (node, ctx) => {
        if (node && node.mapping && typeof node.mapping !== 'object') return (0, _error.default)('mapping must be a [string, string] object', node, ctx);
        if (node && node.mapping && Object.keys(node.mapping).filter(key => typeof node.mapping[key] !== 'string').length !== 0) return (0, _error.default)('mapping must be a [string, string] object', node, ctx);
        return null;
      };
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElEaXNjcmltaW5hdG9yLmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJwcm9wZXJ0eU5hbWUiLCJub2RlIiwiY3R4IiwibWFwcGluZyIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJrZXkiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7OztlQUVlO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxZQUFZLEdBQUc7QUFDYixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksRUFBRUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELFlBQWYsQ0FBSixFQUFrQyxPQUFPLG9CQUFZLHlEQUFaLEVBQXVFQyxJQUF2RSxFQUE2RUMsR0FBN0UsQ0FBUDtBQUNsQyxZQUFJLE9BQU9ELElBQUksQ0FBQ0QsWUFBWixLQUE2QixRQUFqQyxFQUEyQyxPQUFPLG9CQUFZLG9EQUFaLEVBQWtFQyxJQUFsRSxFQUF3RUMsR0FBeEUsQ0FBUDtBQUMzQyxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0QsS0FQUzs7QUFRVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsT0FBYixJQUF3QixPQUFPRixJQUFJLENBQUNFLE9BQVosS0FBd0IsUUFBcEQsRUFBOEQsT0FBTyxvQkFBWSwyQ0FBWixFQUF5REYsSUFBekQsRUFBK0RDLEdBQS9ELENBQVA7QUFDOUQsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLE9BQWIsSUFBd0JDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixJQUFJLENBQUNFLE9BQWpCLEVBQTBCRyxNQUExQixDQUFrQ0MsR0FBRCxJQUFTLE9BQU9OLElBQUksQ0FBQ0UsT0FBTCxDQUFhSSxHQUFiLENBQVAsS0FBNkIsUUFBdkUsRUFBaUZDLE1BQWpGLEtBQTRGLENBQXhILEVBQTJILE9BQU8sb0JBQVksMkNBQVosRUFBeURQLElBQXpELEVBQStEQyxHQUEvRCxDQUFQO0FBQzNILGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRDs7QUFkUztBQURDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBwcm9wZXJ0eU5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIShub2RlICYmIG5vZGUucHJvcGVydHlOYW1lKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdwcm9wZXJ0eU5hbWUgZmllbGQgaXMgcmVxdWlyZWQgZm9yIERpc2NyaW1pbmF0b3Igb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLnByb3BlcnR5TmFtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcigncHJvcGVydHlOYW1lIG9mIHRoZSBEaXNjcmltaW5hdG9yIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBtYXBwaW5nKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tYXBwaW5nICYmIHR5cGVvZiBub2RlLm1hcHBpbmcgIT09ICdvYmplY3QnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ21hcHBpbmcgbXVzdCBiZSBhIFtzdHJpbmcsIHN0cmluZ10gb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tYXBwaW5nICYmIE9iamVjdC5rZXlzKG5vZGUubWFwcGluZykuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBub2RlLm1hcHBpbmdba2V5XSAhPT0gJ3N0cmluZycpLmxlbmd0aCAhPT0gMCkgcmV0dXJuIGNyZWF0ZUVycm9yKCdtYXBwaW5nIG11c3QgYmUgYSBbc3RyaW5nLCBzdHJpbmddIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuXG59O1xuIl19