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

    tokenUrl() {
      return (node, ctx) => {
        if (!node.tokenUrl) return (0, _error.default)('The tokenUrl is required in the Open API Flow Object', node, ctx);
        if (typeof node.tokenUrl !== 'string') return (0, _error.default)('The tokenUrl must be a string in the Open API Flow Object', node, ctx);
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
        const wrongFormatMap = Object.keys(node.scopes).filter(scope => typeof scope !== 'string' || typeof node.scopes[scope] !== 'string').length > 0;
        if (wrongFormatMap) return (0, _error.default)('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx);
        return null;
      };
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9BdXRob3JpemF0aW9uQ29kZU9wZW5BUElGbG93LmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJhdXRob3JpemF0aW9uVXJsIiwibm9kZSIsImN0eCIsInRva2VuVXJsIiwicmVmcmVzaFVybCIsInNjb3BlcyIsIndyb25nRm9ybWF0TWFwIiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsInNjb3BlIiwibGVuZ3RoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsZ0JBQWdCLEdBQUc7QUFDakIsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUksQ0FBQ0QsZ0JBQVYsRUFBNEIsT0FBTyxvQkFBWSw4REFBWixFQUE0RUMsSUFBNUUsRUFBa0ZDLEdBQWxGLENBQVA7QUFDNUIsWUFBSSxPQUFPRCxJQUFJLENBQUNELGdCQUFaLEtBQWlDLFFBQXJDLEVBQStDLE9BQU8sb0JBQVksbUVBQVosRUFBaUZDLElBQWpGLEVBQXVGQyxHQUF2RixDQUFQO0FBQy9DLGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRCxLQVBTOztBQVFWQyxJQUFBQSxRQUFRLEdBQUc7QUFDVCxhQUFPLENBQUNGLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBSSxDQUFDRSxRQUFWLEVBQW9CLE9BQU8sb0JBQVksc0RBQVosRUFBb0VGLElBQXBFLEVBQTBFQyxHQUExRSxDQUFQO0FBQ3BCLFlBQUksT0FBT0QsSUFBSSxDQUFDRSxRQUFaLEtBQXlCLFFBQTdCLEVBQXVDLE9BQU8sb0JBQVksMkRBQVosRUFBeUVGLElBQXpFLEVBQStFQyxHQUEvRSxDQUFQO0FBQ3ZDLGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRCxLQWRTOztBQWVWRSxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0csVUFBTCxJQUFtQixPQUFPSCxJQUFJLENBQUNHLFVBQVosS0FBMkIsUUFBbEQsRUFBNEQsT0FBTyxvQkFBWSw2REFBWixFQUEyRUgsSUFBM0UsRUFBaUZDLEdBQWpGLENBQVA7QUFDNUQsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBcEJTOztBQXFCVkcsSUFBQUEsTUFBTSxHQUFHO0FBQ1AsYUFBTyxDQUFDSixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixjQUFNSSxjQUFjLEdBQUdDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZUCxJQUFJLENBQUNJLE1BQWpCLEVBQ3BCSSxNQURvQixDQUNaQyxLQUFELElBQVcsT0FBT0EsS0FBUCxLQUFpQixRQUFqQixJQUE2QixPQUFPVCxJQUFJLENBQUNJLE1BQUwsQ0FBWUssS0FBWixDQUFQLEtBQThCLFFBRHpELEVBRXBCQyxNQUZvQixHQUVYLENBRlo7QUFHQSxZQUFJTCxjQUFKLEVBQW9CLE9BQU8sb0JBQVksNEVBQVosRUFBMEZMLElBQTFGLEVBQWdHQyxHQUFoRyxDQUFQO0FBQ3BCLGVBQU8sSUFBUDtBQUNELE9BTkQ7QUFPRDs7QUE3QlM7QUFEQyxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uLy4uL2Vycm9yJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgYXV0aG9yaXphdGlvblVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZS5hdXRob3JpemF0aW9uVXJsKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBhdXRob3JpemF0aW9uVXJsIGlzIHJlcXVpcmVkIGluIHRoZSBPcGVuIEFQSSBGbG93IE9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5hdXRob3JpemF0aW9uVXJsICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgYXV0aG9yaXphdGlvblVybCBtdXN0IGJlIGEgc3RyaW5nIGluIHRoZSBPcGVuIEFQSSBGbG93IE9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHRva2VuVXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlLnRva2VuVXJsKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB0b2tlblVybCBpcyByZXF1aXJlZCBpbiB0aGUgT3BlbiBBUEkgRmxvdyBPYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUudG9rZW5VcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB0b2tlblVybCBtdXN0IGJlIGEgc3RyaW5nIGluIHRoZSBPcGVuIEFQSSBGbG93IE9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHJlZnJlc2hVcmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5yZWZyZXNoVXJsICYmIHR5cGVvZiBub2RlLnJlZnJlc2hVcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSByZWZyZXNoVXJsIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc2NvcGVzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgY29uc3Qgd3JvbmdGb3JtYXRNYXAgPSBPYmplY3Qua2V5cyhub2RlLnNjb3BlcylcbiAgICAgICAgICAuZmlsdGVyKChzY29wZSkgPT4gdHlwZW9mIHNjb3BlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2Ygbm9kZS5zY29wZXNbc2NvcGVdICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAubGVuZ3RoID4gMDtcbiAgICAgICAgaWYgKHdyb25nRm9ybWF0TWFwKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzY29wZXMgZmllbGQgbXVzdCBiZSBhIE1hcFtzdHJpbmcsIHN0cmluZ10gaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuIl19