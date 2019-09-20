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
    },

    security() {
      return () => null;
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
    servers: _OpenAPIServer.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElPcGVyYXRpb24uanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsInRhZ3MiLCJub2RlIiwiY3R4IiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwiaXRlbSIsImxlbmd0aCIsInN1bW1hcnkiLCJkZXNjcmlwdGlvbiIsIm9wZXJhdGlvbklkIiwicmVzcG9uc2VzIiwiZGVwcmVjYXRlZCIsInNlY3VyaXR5IiwicHJvcGVydGllcyIsImV4dGVybmFsRG9jcyIsIk9wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24iLCJwYXJhbWV0ZXJzIiwiT3BlbkFQSVBhcmFtZXRlciIsInJlcXVlc3RCb2R5IiwiT3BlbkFQSVJlcXVlc3RCb2R5IiwiT3BlbkFQSVJlc3BvbnNlTWFwIiwiY2FsbGJhY2tzIiwiT3BlbkFQSUNhbGxiYWNrTWFwIiwic2VydmVycyIsIk9wZW5BUElTZXJ2ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQVJBO2VBVWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELElBQWIsSUFBcUIsQ0FBQ0csS0FBSyxDQUFDQyxPQUFOLENBQWNILElBQUksQ0FBQ0QsSUFBbkIsQ0FBMUIsRUFBb0Q7QUFDbEQsaUJBQU8sb0JBQVksbUVBQVosRUFBaUZDLElBQWpGLEVBQXVGQyxHQUF2RixDQUFQO0FBQ0Q7O0FBQ0QsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELElBQWIsSUFBcUJDLElBQUksQ0FBQ0QsSUFBTCxDQUFVSyxNQUFWLENBQWtCQyxJQUFELElBQVUsT0FBT0EsSUFBUCxLQUFnQixRQUEzQyxFQUFxREMsTUFBckQsR0FBOEQsQ0FBdkYsRUFBMEY7QUFDeEYsaUJBQU8sb0JBQVksMkVBQVosRUFBeUZOLElBQXpGLEVBQStGQyxHQUEvRixDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FSRDtBQVNELEtBWFM7O0FBWVZNLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ1AsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNPLE9BQWIsSUFBd0IsT0FBT1AsSUFBSSxDQUFDTyxPQUFaLEtBQXdCLFFBQXBELEVBQThELE9BQU8sb0JBQVksb0NBQVosRUFBa0RQLElBQWxELEVBQXdEQyxHQUF4RCxDQUFQO0FBQzlELGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQWpCUzs7QUFrQlZPLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ1IsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNRLFdBQWIsSUFBNEIsT0FBT1IsSUFBSSxDQUFDUSxXQUFaLEtBQTRCLFFBQTVELEVBQXNFLE9BQU8sb0JBQVksd0NBQVosRUFBc0RSLElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ3RFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQXZCUzs7QUF3QlZRLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ1QsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNTLFdBQWIsSUFBNEIsT0FBT1QsSUFBSSxDQUFDUyxXQUFaLEtBQTRCLFFBQTVELEVBQXNFLE9BQU8sb0JBQVksd0NBQVosRUFBc0RULElBQXRELEVBQTREQyxHQUE1RCxDQUFQO0FBQ3RFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQTdCUzs7QUE4QlZTLElBQUFBLFNBQVMsR0FBRztBQUNWLGFBQU8sQ0FBQ1YsSUFBRCxFQUFPQyxHQUFQLEtBQWdCLENBQUNELElBQUksQ0FBQ1UsU0FBTixHQUFrQixvQkFBWSwwQ0FBWixFQUF3RFYsSUFBeEQsRUFBOERDLEdBQTlELENBQWxCLEdBQXVGLElBQTlHO0FBQ0QsS0FoQ1M7O0FBaUNWVSxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNYLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDVyxVQUFiLElBQTJCLE9BQU9YLElBQUksQ0FBQ1csVUFBWixLQUEyQixTQUExRCxFQUFxRSxPQUFPLG9CQUFZLHVDQUFaLEVBQXFEWCxJQUFyRCxFQUEyREMsR0FBM0QsQ0FBUDtBQUNyRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0F0Q1M7O0FBdUNWVyxJQUFBQSxRQUFRLEdBQUc7QUFDVCxhQUFPLE1BQU0sSUFBYjtBQUNEOztBQXpDUyxHQURDO0FBNENiQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsWUFBWSxFQUFFQyxxQ0FESjtBQUVWQyxJQUFBQSxVQUFVLEVBQUVDLGtDQUZGO0FBR1ZDLElBQUFBLFdBQVcsRUFBRUMsc0NBSEg7QUFJVlQsSUFBQUEsU0FBUyxFQUFFVSxtQ0FKRDtBQUtWQyxJQUFBQSxTQUFTLEVBQUVDLG1DQUxEO0FBTVY7QUFDQTtBQUNBQyxJQUFBQSxPQUFPLEVBQUVDO0FBUkM7QUE1Q0MsQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9uby1jeWNsZSAqL1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uL2Vycm9yJztcblxuaW1wb3J0IHsgT3BlbkFQSVJlc3BvbnNlTWFwIH0gZnJvbSAnLi9PcGVuQVBJUmVzcG9uc2UnO1xuaW1wb3J0IHsgT3BlbkFQSVBhcmFtZXRlciB9IGZyb20gJy4vT3BlbkFQSVBhcmFtZXRlcic7XG5pbXBvcnQgT3BlbkFQSVNlcnZlciBmcm9tICcuL09wZW5BUElTZXJ2ZXInO1xuaW1wb3J0IE9wZW5BUElFeHRlcm5hbERvY3VtZW50YXRpb24gZnJvbSAnLi9PcGVuQVBJRXh0ZXJuYWxEb2N1bWVudGF0aW9uJztcbmltcG9ydCB7IE9wZW5BUElDYWxsYmFja01hcCB9IGZyb20gJy4vT3BlbkFQSUNhbGxiYWNrJztcbmltcG9ydCB7IE9wZW5BUElSZXF1ZXN0Qm9keSB9IGZyb20gJy4vT3BlbkFQSVJlcXVlc3RCb2R5JztcblxuZXhwb3J0IGRlZmF1bHQge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgdGFncygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudGFncyAmJiAhQXJyYXkuaXNBcnJheShub2RlLnRhZ3MpKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgdGFncyBmaWVsZCBtdXN0IGJlIGFuIGFycmF5IGluIHRoZSBPcGVuIEFQSSBPcGVyYXRpb24gb2JqZWN0LicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS50YWdzICYmIG5vZGUudGFncy5maWx0ZXIoKGl0ZW0pID0+IHR5cGVvZiBpdGVtICE9PSAnc3RyaW5nJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignSXRlbXMgb2YgdGhlIHRhZ3MgYXJyYXkgbXVzdCBiZSBzdHJpbmdzIGluIHRoZSBPcGVuIEFQSSBPcGVyYXRpb24gb2JqZWN0LicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgc3VtbWFyeSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuc3VtbWFyeSAmJiB0eXBlb2Ygbm9kZS5zdW1tYXJ5ICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgc3VtbWFyeSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVzY3JpcHRpb24gZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9wZXJhdGlvbklkKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5vcGVyYXRpb25JZCAmJiB0eXBlb2Ygbm9kZS5vcGVyYXRpb25JZCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIG9wZXJhdGlvbklkIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICByZXNwb25zZXMoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKCFub2RlLnJlc3BvbnNlcyA/IGNyZWF0ZUVycm9yKCdPcGVyYXRpb24gbXVzdCBpbmNsdWRlIHJlc3BvbnNlcyBzZWN0aW9uJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgZGVwcmVjYXRlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZGVwcmVjYXRlZCAmJiB0eXBlb2Ygbm9kZS5kZXByZWNhdGVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGRlcHJlY2F0ZWQgZmllbGQgbXVzdCBiZSBhIHN0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHNlY3VyaXR5KCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGV4dGVybmFsRG9jczogT3BlbkFQSUV4dGVybmFsRG9jdW1lbnRhdGlvbixcbiAgICBwYXJhbWV0ZXJzOiBPcGVuQVBJUGFyYW1ldGVyLFxuICAgIHJlcXVlc3RCb2R5OiBPcGVuQVBJUmVxdWVzdEJvZHksXG4gICAgcmVzcG9uc2VzOiBPcGVuQVBJUmVzcG9uc2VNYXAsXG4gICAgY2FsbGJhY2tzOiBPcGVuQVBJQ2FsbGJhY2tNYXAsXG4gICAgLy8gVE9ETzpcbiAgICAvLyBzZWN1cml0eSgpIHt9LFxuICAgIHNlcnZlcnM6IE9wZW5BUElTZXJ2ZXIsXG4gIH0sXG59O1xuIl19