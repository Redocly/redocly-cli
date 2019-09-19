"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIResponse = require("./OpenAPIResponse");

var _OpenAPIParameter = require("./OpenAPIParameter");

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

var _OpenAPIExternalDocumentation = _interopRequireDefault(require("./OpenAPIExternalDocumentation"));

var _OpenAPICallback = require("./OpenAPICallback");

var _OpenAPIRequestBody = require("./OpenAPIRequestBody");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-cycle */
var _default = {
  validators: {
    tags() {
      return (node, ctx) => {
        if (node && node.tags && !Array.isArray(node.tags)) {
          return (0, _error.default)('The tags field must be an array in the Open API Operation object.', node, ctx);
        }

        if (node && node.tags && node.tags.filter(item => typeof item !== 'string').length > 0) {
          return (0, _error.default)('Items of the tags array must be strings in the Open API Operation object.', node, ctx);
        }

        return null;
      };
    },

    summary() {
      return (node, ctx) => {
        if (node && node.summary && typeof node.summary !== 'string') return (0, _error.default)('The summary field must be a string', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return (0, _error.default)('The description field must be a string', node, ctx);
        return null;
      };
    },

    operationId() {
      return (node, ctx) => {
        if (node && node.operationId && typeof node.operationId !== 'string') return (0, _error.default)('The operationId field must be a string', node, ctx);
        return null;
      };
    },

    responses() {
      return (node, ctx) => !node.responses ? (0, _error.default)('Operation must include responses section', node, ctx) : null;
    },

    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return (0, _error.default)('The deprecated field must be a string', node, ctx);
        return null;
      };
    }

  },
  properties: {
    externalDocs: _OpenAPIExternalDocumentation.default,
    parameters: _OpenAPIParameter.OpenAPIParameter,
    requestBody: _OpenAPIRequestBody.OpenAPIRequestBody,
    responses: _OpenAPIResponse.OpenAPIResponseMap,
    callbacks: _OpenAPICallback.OpenAPICallbackMap,
    // TODO:
    // security() {},
    server: _OpenAPIServer.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElPcGVyYXRpb24uanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsInRhZ3MiLCJub2RlIiwiY3R4IiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImxlbmd0aCIsInN1bW1hcnkiLCJkZXNjcmlwdGlvbiIsIm9wZXJhdGlvbklkIiwicmVzcG9uc2VzIiwiZGVwcmVjYXRlZCIsInByb3BlcnRpZXMiLCJleHRlcm5hbERvY3MiLCJPcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uIiwicGFyYW1ldGVycyIsIk9wZW5BUElQYXJhbWV0ZXIiLCJyZXF1ZXN0Qm9keSIsIk9wZW5BUElSZXF1ZXN0Qm9keSIsIk9wZW5BUElSZXNwb25zZU1hcCIsImNhbGxiYWNrcyIsIk9wZW5BUElDYWxsYmFja01hcCIsInNlcnZlciIsIk9wZW5BUElTZXJ2ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQVJBO2VBVWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELElBQWIsSUFBcUIsQ0FBQ0csS0FBSyxDQUFDQyxPQUFOLENBQWNILElBQUksQ0FBQ0QsSUFBbkIsQ0FBMUIsRUFBb0Q7QUFDbEQsaUJBQU8sb0JBQVksbUVBQVosRUFBaUZDLElBQWpGLEVBQXVGQyxHQUF2RixDQUFQO0FBQ0Q7O0FBQ0QsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELElBQWIsSUFBcUJDLElBQUksQ0FBQ0QsSUFBTCxDQUFVSyxNQUFWLENBQWtCQyxJQUFELElBQVUsT0FBT0EsSUFBUCxLQUFnQixRQUEzQyxFQUFxREMsTUFBckQsR0FBOEQsQ0FBdkYsRUFBMEY7QUFDeEYsaUJBQU8sb0JBQVksMkVBQVosRUFBeUZOLElBQXpGLEVBQStGQyxHQUEvRixDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FSRDtBQVNELEtBWFM7O0FBWVZNLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ1AsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNPLE9BQWIsSUFBd0IsT0FBT1AsSUFBSSxDQUFDTyxPQUFaLEtBQXdCLFFBQXBELEVBQThELE9BQU8sb0JBQVksb0NBQVosRUFBa0RQLElBQWxELEVBQXdEQyxHQUF4RCxDQUFQO0FBQzlELGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQWpCUzs7QUFrQlZPLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ1IsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNRLFdBQWIsSUFBNEIsT0FBT1IsSUFBSSxDQUFDUSxXQUFaLEtBQTRCLFFBQTVELEVBQXNFLE9BQU8sb0JBQVksd0NBQVosRUFBc0RSLElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ3RFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQXZCUzs7QUF3QlZRLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ1QsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNTLFdBQWIsSUFBNEIsT0FBT1QsSUFBSSxDQUFDUyxXQUFaLEtBQTRCLFFBQTVELEVBQXNFLE9BQU8sb0JBQVksd0NBQVosRUFBc0RULElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ3RFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQTdCUzs7QUE4QlZTLElBQUFBLFNBQVMsR0FBRztBQUNWLGFBQU8sQ0FBQ1YsSUFBRCxFQUFPQyxHQUFQLEtBQWdCLENBQUNELElBQUksQ0FBQ1UsU0FBTixHQUFrQixvQkFBWSwwQ0FBWixFQUF3RFYsSUFBeEQsRUFBOERDLEdBQTlELENBQWxCLEdBQXVGLElBQTlHO0FBQ0QsS0FoQ1M7O0FBaUNWVSxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNYLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDVyxVQUFiLElBQTJCLE9BQU9YLElBQUksQ0FBQ1csVUFBWixLQUEyQixTQUExRCxFQUFxRSxPQUFPLG9CQUFZLHVDQUFaLEVBQXFEWCxJQUFyRCxFQUEyREMsR0FBM0QsQ0FBUDtBQUNyRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQ7O0FBdENTLEdBREM7QUF5Q2JXLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxZQUFZLEVBQUVDLHFDQURKO0FBRVZDLElBQUFBLFVBQVUsRUFBRUMsa0NBRkY7QUFHVkMsSUFBQUEsV0FBVyxFQUFFQyxzQ0FISDtBQUlWUixJQUFBQSxTQUFTLEVBQUVTLG1DQUpEO0FBS1ZDLElBQUFBLFNBQVMsRUFBRUMsbUNBTEQ7QUFNVjtBQUNBO0FBQ0FDLElBQUFBLE1BQU0sRUFBRUM7QUFSRTtBQXpDQyxDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWN5Y2xlICovXG5pbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5pbXBvcnQgeyBPcGVuQVBJUmVzcG9uc2VNYXAgfSBmcm9tICcuL09wZW5BUElSZXNwb25zZSc7XG5pbXBvcnQgeyBPcGVuQVBJUGFyYW1ldGVyIH0gZnJvbSAnLi9PcGVuQVBJUGFyYW1ldGVyJztcbmltcG9ydCBPcGVuQVBJU2VydmVyIGZyb20gJy4vT3BlbkFQSVNlcnZlcic7XG5pbXBvcnQgT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbiBmcm9tICcuL09wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24nO1xuaW1wb3J0IHsgT3BlbkFQSUNhbGxiYWNrTWFwIH0gZnJvbSAnLi9PcGVuQVBJQ2FsbGJhY2snO1xuaW1wb3J0IHsgT3BlbkFQSVJlcXVlc3RCb2R5IH0gZnJvbSAnLi9PcGVuQVBJUmVxdWVzdEJvZHknO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICB0YWdzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS50YWdzICYmICFBcnJheS5pc0FycmF5KG5vZGUudGFncykpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSB0YWdzIGZpZWxkIG11c3QgYmUgYW4gYXJyYXkgaW4gdGhlIE9wZW4gQVBJIE9wZXJhdGlvbiBvYmplY3QuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnRhZ3MgJiYgbm9kZS50YWdzLmZpbHRlcigoaXRlbSkgPT4gdHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdJdGVtcyBvZiB0aGUgdGFncyBhcnJheSBtdXN0IGJlIHN0cmluZ3MgaW4gdGhlIE9wZW4gQVBJIE9wZXJhdGlvbiBvYmplY3QuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzdW1tYXJ5KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5zdW1tYXJ5ICYmIHR5cGVvZiBub2RlLnN1bW1hcnkgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzdW1tYXJ5IGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZGVzY3JpcHRpb24gJiYgdHlwZW9mIG5vZGUuZGVzY3JpcHRpb24gIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBkZXNjcmlwdGlvbiBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgb3BlcmF0aW9uSWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm9wZXJhdGlvbklkICYmIHR5cGVvZiBub2RlLm9wZXJhdGlvbklkICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgb3BlcmF0aW9uSWQgZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHJlc3BvbnNlcygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUucmVzcG9uc2VzID8gY3JlYXRlRXJyb3IoJ09wZXJhdGlvbiBtdXN0IGluY2x1ZGUgcmVzcG9uc2VzIHNlY3Rpb24nLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBkZXByZWNhdGVkKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5kZXByZWNhdGVkICYmIHR5cGVvZiBub2RlLmRlcHJlY2F0ZWQgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVwcmVjYXRlZCBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBleHRlcm5hbERvY3M6IE9wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24sXG4gICAgcGFyYW1ldGVyczogT3BlbkFQSVBhcmFtZXRlcixcbiAgICByZXF1ZXN0Qm9keTogT3BlbkFQSVJlcXVlc3RCb2R5LFxuICAgIHJlc3BvbnNlczogT3BlbkFQSVJlc3BvbnNlTWFwLFxuICAgIGNhbGxiYWNrczogT3BlbkFQSUNhbGxiYWNrTWFwLFxuICAgIC8vIFRPRE86XG4gICAgLy8gc2VjdXJpdHkoKSB7fSxcbiAgICBzZXJ2ZXI6IE9wZW5BUElTZXJ2ZXIsXG4gIH0sXG59O1xuIl19