"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9DbGllbnRDcmVkZW50aWFsc09wZW5BUElGbG93LmpzIl0sIm5hbWVzIjpbInZhbGlkYXRvcnMiLCJ0b2tlblVybCIsIm5vZGUiLCJjdHgiLCJyZWZyZXNoVXJsIiwic2NvcGVzIiwid3JvbmdGb3JtYXRNYXAiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwic2NvcGUiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7OztlQUVlO0FBQ2JBLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxRQUFRLEdBQUc7QUFDVCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBSSxDQUFDRCxRQUFWLEVBQW9CLE9BQU8sb0JBQVksc0RBQVosRUFBb0VDLElBQXBFLEVBQTBFQyxHQUExRSxDQUFQO0FBQ3BCLFlBQUksT0FBT0QsSUFBSSxDQUFDRCxRQUFaLEtBQXlCLFFBQTdCLEVBQXVDLE9BQU8sb0JBQVksMkRBQVosRUFBeUVDLElBQXpFLEVBQStFQyxHQUEvRSxDQUFQO0FBQ3ZDLGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRCxLQVBTOztBQVFWQyxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNGLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0UsVUFBTCxJQUFtQixPQUFPRixJQUFJLENBQUNFLFVBQVosS0FBMkIsUUFBbEQsRUFBNEQsT0FBTyxvQkFBWSw2REFBWixFQUEyRUYsSUFBM0UsRUFBaUZDLEdBQWpGLENBQVA7QUFDNUQsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBYlM7O0FBY1ZFLElBQUFBLE1BQU0sR0FBRztBQUNQLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsY0FBTUcsY0FBYyxHQUFHQyxNQUFNLENBQUNDLElBQVAsQ0FBWU4sSUFBSSxDQUFDRyxNQUFqQixFQUNwQkksTUFEb0IsQ0FDWkMsS0FBRCxJQUFXLE9BQU9BLEtBQVAsS0FBaUIsUUFBakIsSUFBNkIsT0FBT1IsSUFBSSxDQUFDRyxNQUFMLENBQVlLLEtBQVosQ0FBUCxLQUE4QixRQUR6RCxFQUVwQkMsTUFGb0IsR0FFWCxDQUZaO0FBR0EsWUFBSUwsY0FBSixFQUFvQixPQUFPLG9CQUFZLDRFQUFaLEVBQTBGSixJQUExRixFQUFnR0MsR0FBaEcsQ0FBUDtBQUNwQixlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0Q7O0FBdEJTO0FBREMsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi8uLi9lcnJvcic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHRva2VuVXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlLnRva2VuVXJsKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB0b2tlblVybCBpcyByZXF1aXJlZCBpbiB0aGUgT3BlbiBBUEkgRmxvdyBPYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUudG9rZW5VcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB0b2tlblVybCBtdXN0IGJlIGEgc3RyaW5nIGluIHRoZSBPcGVuIEFQSSBGbG93IE9iamVjdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHJlZnJlc2hVcmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5yZWZyZXNoVXJsICYmIHR5cGVvZiBub2RlLnJlZnJlc2hVcmwgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSByZWZyZXNoVXJsIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc2NvcGVzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgY29uc3Qgd3JvbmdGb3JtYXRNYXAgPSBPYmplY3Qua2V5cyhub2RlLnNjb3BlcylcbiAgICAgICAgICAuZmlsdGVyKChzY29wZSkgPT4gdHlwZW9mIHNjb3BlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2Ygbm9kZS5zY29wZXNbc2NvcGVdICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAubGVuZ3RoID4gMDtcbiAgICAgICAgaWYgKHdyb25nRm9ybWF0TWFwKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzY29wZXMgZmllbGQgbXVzdCBiZSBhIE1hcFtzdHJpbmcsIHN0cmluZ10gaW4gdGhlIE9wZW4gQVBJIEZsb3cgT2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuIl19