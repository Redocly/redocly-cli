"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = require("../error");

var _default = {
  validators: {
    propertyName() {
      return (node, ctx) => {
        if (!(node && node.propertyName)) return (0, _error.createErrorMissingRequiredField)('propertyName', node, ctx);
        if (typeof node.propertyName !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    mapping() {
      return (node, ctx) => {
        if (node && node.mapping && typeof node.mapping !== 'object') return (0, _error.createErrrorFieldTypeMismatch)('Map[string, string]', node, ctx);
        if (node && node.mapping && Object.keys(node.mapping).filter(key => typeof node.mapping[key] !== 'string').length !== 0) return (0, _error.createErrrorFieldTypeMismatch)('Map[string, string]', node, ctx);
        return null;
      };
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElEaXNjcmltaW5hdG9yLmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJwcm9wZXJ0eU5hbWUiLCJub2RlIiwiY3R4IiwibWFwcGluZyIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJrZXkiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7ZUFFZTtBQUNiQSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsWUFBWSxHQUFHO0FBQ2IsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLEVBQUVELElBQUksSUFBSUEsSUFBSSxDQUFDRCxZQUFmLENBQUosRUFBa0MsT0FBTyw0Q0FBZ0MsY0FBaEMsRUFBZ0RDLElBQWhELEVBQXNEQyxHQUF0RCxDQUFQO0FBQ2xDLFlBQUksT0FBT0QsSUFBSSxDQUFDRCxZQUFaLEtBQTZCLFFBQWpDLEVBQTJDLE9BQU8sMENBQThCLFFBQTlCLEVBQXdDQyxJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FBUDtBQUMzQyxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0QsS0FQUzs7QUFRVkMsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsT0FBYixJQUF3QixPQUFPRixJQUFJLENBQUNFLE9BQVosS0FBd0IsUUFBcEQsRUFBOEQsT0FBTywwQ0FBOEIscUJBQTlCLEVBQXFERixJQUFyRCxFQUEyREMsR0FBM0QsQ0FBUDtBQUM5RCxZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsT0FBYixJQUF3QkMsTUFBTSxDQUFDQyxJQUFQLENBQVlKLElBQUksQ0FBQ0UsT0FBakIsRUFBMEJHLE1BQTFCLENBQWtDQyxHQUFELElBQVMsT0FBT04sSUFBSSxDQUFDRSxPQUFMLENBQWFJLEdBQWIsQ0FBUCxLQUE2QixRQUF2RSxFQUFpRkMsTUFBakYsS0FBNEYsQ0FBeEgsRUFBMkgsT0FBTywwQ0FBOEIscUJBQTlCLEVBQXFEUCxJQUFyRCxFQUEyREMsR0FBM0QsQ0FBUDtBQUMzSCxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0Q7O0FBZFM7QUFEQyxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCwgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi9lcnJvcic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHByb3BlcnR5TmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghKG5vZGUgJiYgbm9kZS5wcm9wZXJ0eU5hbWUpKSByZXR1cm4gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgncHJvcGVydHlOYW1lJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLnByb3BlcnR5TmFtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbWFwcGluZygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubWFwcGluZyAmJiB0eXBlb2Ygbm9kZS5tYXBwaW5nICE9PSAnb2JqZWN0JykgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdNYXBbc3RyaW5nLCBzdHJpbmddJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5tYXBwaW5nICYmIE9iamVjdC5rZXlzKG5vZGUubWFwcGluZykuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBub2RlLm1hcHBpbmdba2V5XSAhPT0gJ3N0cmluZycpLmxlbmd0aCAhPT0gMCkgcmV0dXJuIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdNYXBbc3RyaW5nLCBzdHJpbmddJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuIl19