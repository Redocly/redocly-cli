"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    authorizationUrl() {
      return (node, ctx) => {
        if (!node.authorizationUrl) return (0, _error.default)('The authorizationUrl is required in the Open API Flow Object', node, ctx);
        if (typeof node.authorizationUrl !== 'string') return (0, _error.default)('The authorizationUrl must be a string in the Open API Flow Object', node, ctx);
        return null;
      };
    },

    refreshUrl() {
      return (node, ctx) => {
        if (node.refreshUrl && typeof node.refreshUrl !== 'string') return (0, _error.default)('The refreshUrl must be a string in the Open API Flow Object', node, ctx);
        return null;
      };
    },

    scopes() {
      return (node, ctx) => {
        if (!node.scopes) return (0, _error.default)('The scopes field is required for the OpenAPI Flow Object', node, ctx);
        const wrongFormatMap = Object.keys(node.scopes).filter(scope => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string').length > 0;
        if (wrongFormatMap) return (0, _error.default)('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx);
        return null;
      };
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9JbXBsaWNpdE9wZW5BUElGbG93LmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJhdXRob3JpemF0aW9uVXJsIiwibm9kZSIsImN0eCIsInJlZnJlc2hVcmwiLCJzY29wZXMiLCJ3cm9uZ0Zvcm1hdE1hcCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzY29wZSIsImxlbmd0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7O2VBRWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLGdCQUFnQixHQUFHO0FBQ2pCLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFJLENBQUNELGdCQUFWLEVBQTRCLE9BQU8sb0JBQVksOERBQVosRUFBNEVDLElBQTVFLEVBQWtGQyxHQUFsRixDQUFQO0FBQzVCLFlBQUksT0FBT0QsSUFBSSxDQUFDRCxnQkFBWixLQUFpQyxRQUFyQyxFQUErQyxPQUFPLG9CQUFZLG1FQUFaLEVBQWlGQyxJQUFqRixFQUF1RkMsR0FBdkYsQ0FBUDtBQUMvQyxlQUFPLElBQVA7QUFDRCxPQUpEO0FBS0QsS0FQUzs7QUFRVkMsSUFBQUEsVUFBVSxHQUFHO0FBQ1gsYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNFLFVBQUwsSUFBbUIsT0FBT0YsSUFBSSxDQUFDRSxVQUFaLEtBQTJCLFFBQWxELEVBQTRELE9BQU8sb0JBQVksNkRBQVosRUFBMkVGLElBQTNFLEVBQWlGQyxHQUFqRixDQUFQO0FBQzVELGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQWJTOztBQWNWRSxJQUFBQSxNQUFNLEdBQUc7QUFDUCxhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBSSxDQUFDRyxNQUFWLEVBQWtCLE9BQU8sb0JBQVksMERBQVosRUFBd0VILElBQXhFLEVBQThFQyxHQUE5RSxDQUFQO0FBQ2xCLGNBQU1HLGNBQWMsR0FBR0MsTUFBTSxDQUFDQyxJQUFQLENBQVlOLElBQUksQ0FBQ0csTUFBakIsRUFDcEJJLE1BRG9CLENBQ1pDLEtBQUQsSUFBVyxPQUFPQSxLQUFQLEtBQWlCLFFBQWpCLElBQTZCLE9BQU9SLElBQUksQ0FBQ0csTUFBTCxDQUFZSyxLQUFaLENBQVAsS0FBOEIsUUFEekQsRUFFcEJDLE1BRm9CLEdBRVgsQ0FGWjtBQUdBLFlBQUlMLGNBQUosRUFBb0IsT0FBTyxvQkFBWSw0RUFBWixFQUEwRkosSUFBMUYsRUFBZ0dDLEdBQWhHLENBQVA7QUFDcEIsZUFBTyxJQUFQO0FBQ0QsT0FQRDtBQVFEOztBQXZCUztBQURDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vLi4vZXJyb3InO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBhdXRob3JpemF0aW9uVXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlLmF1dGhvcml6YXRpb25VcmwpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGF1dGhvcml6YXRpb25VcmwgaXMgcmVxdWlyZWQgaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmF1dGhvcml6YXRpb25VcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBhdXRob3JpemF0aW9uVXJsIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVmcmVzaFVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnJlZnJlc2hVcmwgJiYgdHlwZW9mIG5vZGUucmVmcmVzaFVybCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHJlZnJlc2hVcmwgbXVzdCBiZSBhIHN0cmluZyBpbiB0aGUgT3BlbiBBUEkgRmxvdyBPYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzY29wZXMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUuc2NvcGVzKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzY29wZXMgZmllbGQgaXMgcmVxdWlyZWQgZm9yIHRoZSBPcGVuQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgY29uc3Qgd3JvbmdGb3JtYXRNYXAgPSBPYmplY3Qua2V5cyhub2RlLnNjb3BlcylcbiAgICAgICAgICAuZmlsdGVyKChzY29wZSkgPT4gdHlwZW9mIHNjb3BlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2Ygbm9kZS5zY29wZXNbc2NvcGVdICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAubGVuZ3RoID4gMDtcbiAgICAgICAgaWYgKHdyb25nRm9ybWF0TWFwKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzY29wZXMgZmllbGQgbXVzdCBiZSBhIE1hcFtzdHJpbmcsIHN0cmluZ10gaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuIl19