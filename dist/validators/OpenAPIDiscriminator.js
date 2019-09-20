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
        if (!(node && node.propertyName)) return (0, _error.default)('propertyName field is required for Discriminator object', node, ctx, 'key');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElEaXNjcmltaW5hdG9yLmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJwcm9wZXJ0eU5hbWUiLCJub2RlIiwiY3R4IiwibWFwcGluZyIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJrZXkiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7OztlQUVlO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxZQUFZLEdBQUc7QUFDYixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksRUFBRUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELFlBQWYsQ0FBSixFQUFrQyxPQUFPLG9CQUFZLHlEQUFaLEVBQXVFQyxJQUF2RSxFQUE2RUMsR0FBN0UsRUFBa0YsS0FBbEYsQ0FBUDtBQUNsQyxZQUFJLE9BQU9ELElBQUksQ0FBQ0QsWUFBWixLQUE2QixRQUFqQyxFQUEyQyxPQUFPLG9CQUFZLG9EQUFaLEVBQWtFQyxJQUFsRSxFQUF3RUMsR0FBeEUsQ0FBUDtBQUMzQyxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0QsS0FQUzs7QUFRVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsT0FBYixJQUF3QixPQUFPRixJQUFJLENBQUNFLE9BQVosS0FBd0IsUUFBcEQsRUFBOEQsT0FBTyxvQkFBWSwyQ0FBWixFQUF5REYsSUFBekQsRUFBK0RDLEdBQS9ELENBQVA7QUFDOUQsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLE9BQWIsSUFBd0JDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixJQUFJLENBQUNFLE9BQWpCLEVBQTBCRyxNQUExQixDQUFrQ0MsR0FBRCxJQUFTLE9BQU9OLElBQUksQ0FBQ0UsT0FBTCxDQUFhSSxHQUFiLENBQVAsS0FBNkIsUUFBdkUsRUFBaUZDLE1BQWpGLEtBQTRGLENBQXhILEVBQTJILE9BQU8sb0JBQVksMkNBQVosRUFBeURQLElBQXpELEVBQStEQyxHQUEvRCxDQUFQO0FBQzNILGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRDs7QUFkUztBQURDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBwcm9wZXJ0eU5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIShub2RlICYmIG5vZGUucHJvcGVydHlOYW1lKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdwcm9wZXJ0eU5hbWUgZmllbGQgaXMgcmVxdWlyZWQgZm9yIERpc2NyaW1pbmF0b3Igb2JqZWN0Jywgbm9kZSwgY3R4LCAna2V5Jyk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5wcm9wZXJ0eU5hbWUgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ3Byb3BlcnR5TmFtZSBvZiB0aGUgRGlzY3JpbWluYXRvciBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWFwcGluZygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubWFwcGluZyAmJiB0eXBlb2Ygbm9kZS5tYXBwaW5nICE9PSAnb2JqZWN0JykgcmV0dXJuIGNyZWF0ZUVycm9yKCdtYXBwaW5nIG11c3QgYmUgYSBbc3RyaW5nLCBzdHJpbmddIG9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubWFwcGluZyAmJiBPYmplY3Qua2V5cyhub2RlLm1hcHBpbmcpLmZpbHRlcigoa2V5KSA9PiB0eXBlb2Ygbm9kZS5tYXBwaW5nW2tleV0gIT09ICdzdHJpbmcnKS5sZW5ndGggIT09IDApIHJldHVybiBjcmVhdGVFcnJvcignbWFwcGluZyBtdXN0IGJlIGEgW3N0cmluZywgc3RyaW5nXSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcblxufTtcbiJdfQ==