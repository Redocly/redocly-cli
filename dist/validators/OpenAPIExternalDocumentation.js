"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireWildcard(require("../error"));

var _utils = require("../utils");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const OpenAPIExternalDocumentation = {
  validators: {
    description() {
      return (node, ctx) => node && node.description && typeof node.description !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    url() {
      return (node, ctx) => {
        if (node && !node.url) return (0, _error.createErrorMissingRequiredField)('url', node, ctx, 'key');
        if (!(0, _utils.isUrl)(node.url)) return (0, _error.default)('url must be a valid URL', node, ctx);
        return null;
      };
    }

  }
};
var _default = OpenAPIExternalDocumentation;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24uanMiXSwibmFtZXMiOlsiT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiIsInZhbGlkYXRvcnMiLCJkZXNjcmlwdGlvbiIsIm5vZGUiLCJjdHgiLCJ1cmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7Ozs7O0FBRUEsTUFBTUEsNEJBQTRCLEdBQUc7QUFDbkNDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFnQkQsSUFBSSxJQUFJQSxJQUFJLENBQUNELFdBQWIsSUFBNEIsT0FBT0MsSUFBSSxDQUFDRCxXQUFaLEtBQTRCLFFBQXhELEdBQW1FLDBDQUE4QixRQUE5QixFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQW5FLEdBQXdILElBQS9JO0FBQ0QsS0FIUzs7QUFJVkMsSUFBQUEsR0FBRyxHQUFHO0FBQ0osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUksQ0FBQ0EsSUFBSSxDQUFDRSxHQUFsQixFQUF1QixPQUFPLDRDQUFnQyxLQUFoQyxFQUF1Q0YsSUFBdkMsRUFBNkNDLEdBQTdDLEVBQWtELEtBQWxELENBQVA7QUFDdkIsWUFBSSxDQUFDLGtCQUFNRCxJQUFJLENBQUNFLEdBQVgsQ0FBTCxFQUFzQixPQUFPLG9CQUFZLHlCQUFaLEVBQXVDRixJQUF2QyxFQUE2Q0MsR0FBN0MsQ0FBUDtBQUN0QixlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0Q7O0FBVlM7QUFEdUIsQ0FBckM7ZUFlZUosNEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IsIHsgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2gsIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQgfSBmcm9tICcuLi9lcnJvcic7XG5cbmltcG9ydCB7IGlzVXJsIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5jb25zdCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycgPyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgdXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgIW5vZGUudXJsKSByZXR1cm4gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgndXJsJywgbm9kZSwgY3R4LCAna2V5Jyk7XG4gICAgICAgIGlmICghaXNVcmwobm9kZS51cmwpKSByZXR1cm4gY3JlYXRlRXJyb3IoJ3VybCBtdXN0IGJlIGEgdmFsaWQgVVJMJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uO1xuIl19