"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPILinkMap = exports.OpenAPILink = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIServer = _interopRequireDefault(require("./OpenAPIServer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPILink = {
  validators: {
    operationRef() {
      return (node, ctx) => {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return (0, _error.default)('Fields operationRef and operationId are mutually exclusive', node, ctx);
        if (typeof node.operationRef !== 'string') return (0, _error.default)('The operationRef field must be a string in the Open API Link', node, ctx);
        return null;
      };
    },

    operationId() {
      return (node, ctx) => {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return (0, _error.default)('Fields operationId and operationRef are mutually exclusive', node, ctx);
        if (typeof node.operationId !== 'string') return (0, _error.default)('The operationId field must be a string in the Open API Link', node, ctx);
        return null;
      };
    },

    parameters() {
      return (node, ctx) => {
        if (!node || !node.parameters) return null;

        if (Object.keys(node.parameters).filter(key => typeof key !== 'string').length > 0) {
          return (0, _error.default)('The parameters field must be a Map with string keys', node, ctx);
        }

        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (!node || !node.description) return null;

        if (typeof node.description !== 'string') {
          return (0, _error.default)('The description field must be a string in the Open API Link', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    server: _OpenAPIServer.default
  }
};
exports.OpenAPILink = OpenAPILink;
const OpenAPILinkMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPILink;
    });
    return props;
  }

};
exports.OpenAPILinkMap = OpenAPILinkMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElMaW5rLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaW5rIiwidmFsaWRhdG9ycyIsIm9wZXJhdGlvblJlZiIsIm5vZGUiLCJjdHgiLCJvcGVyYXRpb25JZCIsInBhcmFtZXRlcnMiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwibGVuZ3RoIiwiZGVzY3JpcHRpb24iLCJwcm9wZXJ0aWVzIiwic2VydmVyIiwiT3BlbkFQSVNlcnZlciIsIk9wZW5BUElMaW5rTWFwIiwicHJvcHMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O0FBRU8sTUFBTUEsV0FBVyxHQUFHO0FBQ3pCQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsWUFBWSxHQUFHO0FBQ2IsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNELFlBQW5CLEVBQWlDLE9BQU8sSUFBUDtBQUNqQyxZQUFJQyxJQUFJLENBQUNELFlBQUwsSUFBcUJDLElBQUksQ0FBQ0UsV0FBOUIsRUFBMkMsT0FBTyxvQkFBWSw0REFBWixFQUEwRUYsSUFBMUUsRUFBZ0ZDLEdBQWhGLENBQVA7QUFDM0MsWUFBSSxPQUFPRCxJQUFJLENBQUNELFlBQVosS0FBNkIsUUFBakMsRUFBMkMsT0FBTyxvQkFBWSw4REFBWixFQUE0RUMsSUFBNUUsRUFBa0ZDLEdBQWxGLENBQVA7QUFDM0MsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1ELEtBUlM7O0FBU1ZDLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRSxXQUFuQixFQUFnQyxPQUFPLElBQVA7QUFDaEMsWUFBSUYsSUFBSSxDQUFDRCxZQUFMLElBQXFCQyxJQUFJLENBQUNFLFdBQTlCLEVBQTJDLE9BQU8sb0JBQVksNERBQVosRUFBMEVGLElBQTFFLEVBQWdGQyxHQUFoRixDQUFQO0FBQzNDLFlBQUksT0FBT0QsSUFBSSxDQUFDRSxXQUFaLEtBQTRCLFFBQWhDLEVBQTBDLE9BQU8sb0JBQVksNkRBQVosRUFBMkVGLElBQTNFLEVBQWlGQyxHQUFqRixDQUFQO0FBQzFDLGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQWhCUzs7QUFpQlZFLElBQUFBLFVBQVUsR0FBRztBQUNYLGFBQU8sQ0FBQ0gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRyxVQUFuQixFQUErQixPQUFPLElBQVA7O0FBQy9CLFlBQUlDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTCxJQUFJLENBQUNHLFVBQWpCLEVBQTZCRyxNQUE3QixDQUFxQ0MsR0FBRCxJQUFTLE9BQU9BLEdBQVAsS0FBZSxRQUE1RCxFQUFzRUMsTUFBdEUsR0FBK0UsQ0FBbkYsRUFBc0Y7QUFDcEYsaUJBQU8sb0JBQVkscURBQVosRUFBbUVSLElBQW5FLEVBQXlFQyxHQUF6RSxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FORDtBQU9ELEtBekJTOztBQTBCVlEsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDVCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNTLFdBQW5CLEVBQWdDLE9BQU8sSUFBUDs7QUFDaEMsWUFBSSxPQUFPVCxJQUFJLENBQUNTLFdBQVosS0FBNEIsUUFBaEMsRUFBMEM7QUFDeEMsaUJBQU8sb0JBQVksNkRBQVosRUFBMkVULElBQTNFLEVBQWlGQyxHQUFqRixDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FORDtBQU9EOztBQWxDUyxHQURhO0FBcUN6QlMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE1BQU0sRUFBRUM7QUFERTtBQXJDYSxDQUFwQjs7QUEwQ0EsTUFBTUMsY0FBYyxHQUFHO0FBQzVCSCxFQUFBQSxVQUFVLENBQUNWLElBQUQsRUFBTztBQUNmLFVBQU1jLEtBQUssR0FBRyxFQUFkO0FBQ0FWLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTCxJQUFaLEVBQWtCZSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CRixNQUFBQSxLQUFLLENBQUNFLENBQUQsQ0FBTCxHQUFXbkIsV0FBWDtBQUNELEtBRkQ7QUFHQSxXQUFPaUIsS0FBUDtBQUNEOztBQVAyQixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5pbXBvcnQgT3BlbkFQSVNlcnZlciBmcm9tICcuL09wZW5BUElTZXJ2ZXInO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUxpbmsgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBvcGVyYXRpb25SZWYoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUgfHwgIW5vZGUub3BlcmF0aW9uUmVmKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0aW9uUmVmICYmIG5vZGUub3BlcmF0aW9uSWQpIHJldHVybiBjcmVhdGVFcnJvcignRmllbGRzIG9wZXJhdGlvblJlZiBhbmQgb3BlcmF0aW9uSWQgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZScsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5vcGVyYXRpb25SZWYgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBvcGVyYXRpb25SZWYgZmllbGQgbXVzdCBiZSBhIHN0cmluZyBpbiB0aGUgT3BlbiBBUEkgTGluaycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9wZXJhdGlvbklkKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLm9wZXJhdGlvbklkKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0aW9uUmVmICYmIG5vZGUub3BlcmF0aW9uSWQpIHJldHVybiBjcmVhdGVFcnJvcignRmllbGRzIG9wZXJhdGlvbklkIGFuZCBvcGVyYXRpb25SZWYgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZScsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5vcGVyYXRpb25JZCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIG9wZXJhdGlvbklkIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIExpbmsnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBwYXJhbWV0ZXJzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLnBhcmFtZXRlcnMpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMobm9kZS5wYXJhbWV0ZXJzKS5maWx0ZXIoKGtleSkgPT4gdHlwZW9mIGtleSAhPT0gJ3N0cmluZycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBwYXJhbWV0ZXJzIGZpZWxkIG11c3QgYmUgYSBNYXAgd2l0aCBzdHJpbmcga2V5cycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUgfHwgIW5vZGUuZGVzY3JpcHRpb24pIHJldHVybiBudWxsO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuZGVzY3JpcHRpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZGVzY3JpcHRpb24gZmllbGQgbXVzdCBiZSBhIHN0cmluZyBpbiB0aGUgT3BlbiBBUEkgTGluaycsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBzZXJ2ZXI6IE9wZW5BUElTZXJ2ZXIsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUxpbmtNYXAgPSB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJTGluaztcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19