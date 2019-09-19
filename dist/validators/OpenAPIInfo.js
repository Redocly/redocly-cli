"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIInfo = exports.OpenAPILicense = void 0;

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => !node || !node.name ? (0, _error.default)('Name is required for the license object', node, ctx, 'key') : null;
    }

  }
};
exports.OpenAPILicense = OpenAPILicense;
const OpenAPIInfo = {
  validators: {
    title() {
      return (node, ctx) => !node || !node.title ? (0, _error.default)('Info section must include title', node, ctx, 'key') : null;
    },

    version() {
      return (node, ctx) => !node || !node.version ? (0, _error.default)('Version is required for the info section', node, ctx, 'key') : null;
    }

  },
  properties: {
    license: OpenAPILicense
  }
};
exports.OpenAPIInfo = OpenAPIInfo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElJbmZvLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaWNlbnNlIiwidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwiT3BlbkFQSUluZm8iLCJ0aXRsZSIsInZlcnNpb24iLCJwcm9wZXJ0aWVzIiwibGljZW5zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7O0FBRU8sTUFBTUEsY0FBYyxHQUFHO0FBQzVCQyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ0QsSUFBZixHQUFzQixvQkFBWSx5Q0FBWixFQUF1REMsSUFBdkQsRUFBNkRDLEdBQTdELEVBQWtFLEtBQWxFLENBQXRCLEdBQWlHLElBQXhIO0FBQ0Q7O0FBSFM7QUFEZ0IsQ0FBdkI7O0FBUUEsTUFBTUMsV0FBVyxHQUFHO0FBQ3pCSixFQUFBQSxVQUFVLEVBQUU7QUFDVkssSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ0csS0FBZixHQUF1QixvQkFBWSxpQ0FBWixFQUErQ0gsSUFBL0MsRUFBcURDLEdBQXJELEVBQTBELEtBQTFELENBQXZCLEdBQTBGLElBQWpIO0FBQ0QsS0FIUzs7QUFJVkcsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDSixJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ0ksT0FBZixHQUF5QixvQkFBWSwwQ0FBWixFQUF3REosSUFBeEQsRUFBOERDLEdBQTlELEVBQW1FLEtBQW5FLENBQXpCLEdBQXFHLElBQTVIO0FBQ0Q7O0FBTlMsR0FEYTtBQVN6QkksRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sRUFBRVQ7QUFEQztBQVRhLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uL2Vycm9yJztcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElMaWNlbnNlID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgbmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUgfHwgIW5vZGUubmFtZSA/IGNyZWF0ZUVycm9yKCdOYW1lIGlzIHJlcXVpcmVkIGZvciB0aGUgbGljZW5zZSBvYmplY3QnLCBub2RlLCBjdHgsICdrZXknKSA6IG51bGwpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUluZm8gPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICB0aXRsZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUgfHwgIW5vZGUudGl0bGUgPyBjcmVhdGVFcnJvcignSW5mbyBzZWN0aW9uIG11c3QgaW5jbHVkZSB0aXRsZScsIG5vZGUsIGN0eCwgJ2tleScpIDogbnVsbCk7XG4gICAgfSxcbiAgICB2ZXJzaW9uKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICghbm9kZSB8fCAhbm9kZS52ZXJzaW9uID8gY3JlYXRlRXJyb3IoJ1ZlcnNpb24gaXMgcmVxdWlyZWQgZm9yIHRoZSBpbmZvIHNlY3Rpb24nLCBub2RlLCBjdHgsICdrZXknKSA6IG51bGwpO1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBsaWNlbnNlOiBPcGVuQVBJTGljZW5zZSxcbiAgfSxcbn07XG4iXX0=