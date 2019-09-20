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
    },

    requestBody() {
      return () => null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElMaW5rLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaW5rIiwidmFsaWRhdG9ycyIsIm9wZXJhdGlvblJlZiIsIm5vZGUiLCJjdHgiLCJvcGVyYXRpb25JZCIsInBhcmFtZXRlcnMiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwibGVuZ3RoIiwiZGVzY3JpcHRpb24iLCJyZXF1ZXN0Qm9keSIsInByb3BlcnRpZXMiLCJzZXJ2ZXIiLCJPcGVuQVBJU2VydmVyIiwiT3BlbkFQSUxpbmtNYXAiLCJwcm9wcyIsImZvckVhY2giLCJrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFFTyxNQUFNQSxXQUFXLEdBQUc7QUFDekJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxZQUFZLEdBQUc7QUFDYixhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ0QsWUFBbkIsRUFBaUMsT0FBTyxJQUFQO0FBQ2pDLFlBQUlDLElBQUksQ0FBQ0QsWUFBTCxJQUFxQkMsSUFBSSxDQUFDRSxXQUE5QixFQUEyQyxPQUFPLG9CQUFZLDREQUFaLEVBQTBFRixJQUExRSxFQUFnRkMsR0FBaEYsQ0FBUDtBQUMzQyxZQUFJLE9BQU9ELElBQUksQ0FBQ0QsWUFBWixLQUE2QixRQUFqQyxFQUEyQyxPQUFPLG9CQUFZLDhEQUFaLEVBQTRFQyxJQUE1RSxFQUFrRkMsR0FBbEYsQ0FBUDtBQUMzQyxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0FSUzs7QUFTVkMsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNFLFdBQW5CLEVBQWdDLE9BQU8sSUFBUDtBQUNoQyxZQUFJRixJQUFJLENBQUNELFlBQUwsSUFBcUJDLElBQUksQ0FBQ0UsV0FBOUIsRUFBMkMsT0FBTyxvQkFBWSw0REFBWixFQUEwRUYsSUFBMUUsRUFBZ0ZDLEdBQWhGLENBQVA7QUFDM0MsWUFBSSxPQUFPRCxJQUFJLENBQUNFLFdBQVosS0FBNEIsUUFBaEMsRUFBMEMsT0FBTyxvQkFBWSw2REFBWixFQUEyRUYsSUFBM0UsRUFBaUZDLEdBQWpGLENBQVA7QUFDMUMsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1ELEtBaEJTOztBQWlCVkUsSUFBQUEsVUFBVSxHQUFHO0FBQ1gsYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNHLFVBQW5CLEVBQStCLE9BQU8sSUFBUDs7QUFDL0IsWUFBSUMsTUFBTSxDQUFDQyxJQUFQLENBQVlMLElBQUksQ0FBQ0csVUFBakIsRUFBNkJHLE1BQTdCLENBQXFDQyxHQUFELElBQVMsT0FBT0EsR0FBUCxLQUFlLFFBQTVELEVBQXNFQyxNQUF0RSxHQUErRSxDQUFuRixFQUFzRjtBQUNwRixpQkFBTyxvQkFBWSxxREFBWixFQUFtRVIsSUFBbkUsRUFBeUVDLEdBQXpFLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0QsS0F6QlM7O0FBMEJWUSxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNULElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ1MsV0FBbkIsRUFBZ0MsT0FBTyxJQUFQOztBQUNoQyxZQUFJLE9BQU9ULElBQUksQ0FBQ1MsV0FBWixLQUE0QixRQUFoQyxFQUEwQztBQUN4QyxpQkFBTyxvQkFBWSw2REFBWixFQUEyRVQsSUFBM0UsRUFBaUZDLEdBQWpGLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0QsS0FsQ1M7O0FBbUNWUyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLE1BQU0sSUFBYjtBQUNEOztBQXJDUyxHQURhO0FBd0N6QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE1BQU0sRUFBRUM7QUFERTtBQXhDYSxDQUFwQjs7QUE2Q0EsTUFBTUMsY0FBYyxHQUFHO0FBQzVCSCxFQUFBQSxVQUFVLENBQUNYLElBQUQsRUFBTztBQUNmLFVBQU1lLEtBQUssR0FBRyxFQUFkO0FBQ0FYLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTCxJQUFaLEVBQWtCZ0IsT0FBbEIsQ0FBMkJDLENBQUQsSUFBTztBQUMvQkYsTUFBQUEsS0FBSyxDQUFDRSxDQUFELENBQUwsR0FBV3BCLFdBQVg7QUFDRCxLQUZEO0FBR0EsV0FBT2tCLEtBQVA7QUFDRDs7QUFQMkIsQ0FBdkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuaW1wb3J0IE9wZW5BUElTZXJ2ZXIgZnJvbSAnLi9PcGVuQVBJU2VydmVyJztcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElMaW5rID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgb3BlcmF0aW9uUmVmKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLm9wZXJhdGlvblJlZikgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmIChub2RlLm9wZXJhdGlvblJlZiAmJiBub2RlLm9wZXJhdGlvbklkKSByZXR1cm4gY3JlYXRlRXJyb3IoJ0ZpZWxkcyBvcGVyYXRpb25SZWYgYW5kIG9wZXJhdGlvbklkIGFyZSBtdXR1YWxseSBleGNsdXNpdmUnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUub3BlcmF0aW9uUmVmICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgb3BlcmF0aW9uUmVmIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIExpbmsnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBvcGVyYXRpb25JZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS5vcGVyYXRpb25JZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmIChub2RlLm9wZXJhdGlvblJlZiAmJiBub2RlLm9wZXJhdGlvbklkKSByZXR1cm4gY3JlYXRlRXJyb3IoJ0ZpZWxkcyBvcGVyYXRpb25JZCBhbmQgb3BlcmF0aW9uUmVmIGFyZSBtdXR1YWxseSBleGNsdXNpdmUnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUub3BlcmF0aW9uSWQgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBvcGVyYXRpb25JZCBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGluIHRoZSBPcGVuIEFQSSBMaW5rJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcGFyYW1ldGVycygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS5wYXJhbWV0ZXJzKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG5vZGUucGFyYW1ldGVycykuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgcGFyYW1ldGVycyBmaWVsZCBtdXN0IGJlIGEgTWFwIHdpdGggc3RyaW5nIGtleXMnLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGRlc2NyaXB0aW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFub2RlLmRlc2NyaXB0aW9uKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGRlc2NyaXB0aW9uIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcgaW4gdGhlIE9wZW4gQVBJIExpbmsnLCBub2RlLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHJlcXVlc3RCb2R5KCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIHNlcnZlcjogT3BlbkFQSVNlcnZlcixcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJTGlua01hcCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElMaW5rO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9wcztcbiAgfSxcbn07XG4iXX0=