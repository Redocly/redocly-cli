"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIInfo = exports.OpenAPIContact = exports.OpenAPILicense = void 0;

var _error = _interopRequireWildcard(require("../error"));

var _utils = require("../utils");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const OpenAPILicense = {
  validators: {
    name() {
      return (node, ctx) => !node || !node.name ? (0, _error.createErrorMissingRequiredField)('name', node, ctx) : null;
    },

    url() {
      return (node, ctx) => node && node.url && !(0, _utils.isUrl)(node.url) ? (0, _error.default)('The url field must be a valid URL', node, ctx) : null;
    }

  }
};
exports.OpenAPILicense = OpenAPILicense;
const OpenAPIContact = {
  validators: {
    name() {
      return (node, ctx) => node && node.name && typeof node.name !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    url() {
      return (node, ctx) => node && node.url && typeof node.url !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    },

    email() {
      return (node, ctx) => node && node.url && typeof node.url !== 'string' ? (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx) : null;
    }

  }
};
exports.OpenAPIContact = OpenAPIContact;
const OpenAPIInfo = {
  name: 'OpenAPIInfo',
  validators: {
    title() {
      return (node, ctx) => !node || !node.title ? (0, _error.createErrorMissingRequiredField)('title', node, ctx) : null;
    },

    version() {
      return (node, ctx) => !node || !node.version ? (0, _error.createErrorMissingRequiredField)('version', node, ctx) : null;
    },

    description() {
      return () => null;
    },

    termsOfService() {
      return () => null;
    }

  },
  properties: {
    license: OpenAPILicense,
    contact: OpenAPIContact
  }
};
exports.OpenAPIInfo = OpenAPIInfo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElJbmZvLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaWNlbnNlIiwidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwidXJsIiwiT3BlbkFQSUNvbnRhY3QiLCJlbWFpbCIsIk9wZW5BUElJbmZvIiwidGl0bGUiLCJ2ZXJzaW9uIiwiZGVzY3JpcHRpb24iLCJ0ZXJtc09mU2VydmljZSIsInByb3BlcnRpZXMiLCJsaWNlbnNlIiwiY29udGFjdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFFTyxNQUFNQSxjQUFjLEdBQUc7QUFDNUJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFnQixDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRCxJQUFmLEdBQXNCLDRDQUFnQyxNQUFoQyxFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQXRCLEdBQTJFLElBQWxHO0FBQ0QsS0FIUzs7QUFJVkMsSUFBQUEsR0FBRyxHQUFHO0FBQ0osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRSxHQUFiLElBQW9CLENBQUMsa0JBQU1GLElBQUksQ0FBQ0UsR0FBWCxDQUFyQixHQUF1QyxvQkFBWSxtQ0FBWixFQUFpREYsSUFBakQsRUFBdURDLEdBQXZELENBQXZDLEdBQXFHLElBQTVIO0FBQ0Q7O0FBTlM7QUFEZ0IsQ0FBdkI7O0FBV0EsTUFBTUUsY0FBYyxHQUFHO0FBQzVCTCxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBaUJELElBQUksSUFBSUEsSUFBSSxDQUFDRCxJQUFkLElBQXVCLE9BQU9DLElBQUksQ0FBQ0QsSUFBWixLQUFxQixRQUE1QyxHQUF1RCwwQ0FBOEIsUUFBOUIsRUFBd0NDLElBQXhDLEVBQThDQyxHQUE5QyxDQUF2RCxHQUE0RyxJQUFuSTtBQUNELEtBSFM7O0FBSVZDLElBQUFBLEdBQUcsR0FBRztBQUNKLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWlCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsR0FBZCxJQUFzQixPQUFPRixJQUFJLENBQUNFLEdBQVosS0FBb0IsUUFBMUMsR0FBcUQsMENBQThCLFFBQTlCLEVBQXdDRixJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FBckQsR0FBMEcsSUFBakk7QUFDRCxLQU5TOztBQU9WRyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPLENBQUNKLElBQUQsRUFBT0MsR0FBUCxLQUFpQkQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLEdBQWQsSUFBc0IsT0FBT0YsSUFBSSxDQUFDRSxHQUFaLEtBQW9CLFFBQTFDLEdBQXFELDBDQUE4QixRQUE5QixFQUF3Q0YsSUFBeEMsRUFBOENDLEdBQTlDLENBQXJELEdBQTBHLElBQWpJO0FBQ0Q7O0FBVFM7QUFEZ0IsQ0FBdkI7O0FBY0EsTUFBTUksV0FBVyxHQUFHO0FBQ3pCTixFQUFBQSxJQUFJLEVBQUUsYUFEbUI7QUFFekJELEVBQUFBLFVBQVUsRUFBRTtBQUNWUSxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPLENBQUNOLElBQUQsRUFBT0MsR0FBUCxLQUFnQixDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDTSxLQUFmLEdBQXVCLDRDQUFnQyxPQUFoQyxFQUF5Q04sSUFBekMsRUFBK0NDLEdBQS9DLENBQXZCLEdBQTZFLElBQXBHO0FBQ0QsS0FIUzs7QUFJVk0sSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDUCxJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ08sT0FBZixHQUF5Qiw0Q0FBZ0MsU0FBaEMsRUFBMkNQLElBQTNDLEVBQWlEQyxHQUFqRCxDQUF6QixHQUFpRixJQUF4RztBQUNELEtBTlM7O0FBT1ZPLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sTUFBTSxJQUFiO0FBQ0QsS0FUUzs7QUFVVkMsSUFBQUEsY0FBYyxHQUFHO0FBQ2YsYUFBTyxNQUFNLElBQWI7QUFDRDs7QUFaUyxHQUZhO0FBZ0J6QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sRUFBRWQsY0FEQztBQUVWZSxJQUFBQSxPQUFPLEVBQUVUO0FBRkM7QUFoQmEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IsIHsgY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCwgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi9lcnJvcic7XG5pbXBvcnQgeyBpc1VybCB9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElMaWNlbnNlID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgbmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUgfHwgIW5vZGUubmFtZSA/IGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ25hbWUnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICB1cmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKG5vZGUgJiYgbm9kZS51cmwgJiYgIWlzVXJsKG5vZGUudXJsKSA/IGNyZWF0ZUVycm9yKCdUaGUgdXJsIGZpZWxkIG11c3QgYmUgYSB2YWxpZCBVUkwnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJQ29udGFjdCA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIG5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKChub2RlICYmIG5vZGUubmFtZSkgJiYgdHlwZW9mIG5vZGUubmFtZSAhPT0gJ3N0cmluZycgPyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgdXJsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICgobm9kZSAmJiBub2RlLnVybCkgJiYgdHlwZW9mIG5vZGUudXJsICE9PSAnc3RyaW5nJyA/IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBlbWFpbCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoKG5vZGUgJiYgbm9kZS51cmwpICYmIHR5cGVvZiBub2RlLnVybCAhPT0gJ3N0cmluZycgPyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUluZm8gPSB7XG4gIG5hbWU6ICdPcGVuQVBJSW5mbycsXG4gIHZhbGlkYXRvcnM6IHtcbiAgICB0aXRsZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUgfHwgIW5vZGUudGl0bGUgPyBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCd0aXRsZScsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIHZlcnNpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKCFub2RlIHx8ICFub2RlLnZlcnNpb24gPyBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCd2ZXJzaW9uJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKCkgPT4gbnVsbDtcbiAgICB9LFxuICAgIHRlcm1zT2ZTZXJ2aWNlKCkge1xuICAgICAgcmV0dXJuICgpID0+IG51bGw7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGxpY2Vuc2U6IE9wZW5BUElMaWNlbnNlLFxuICAgIGNvbnRhY3Q6IE9wZW5BUElDb250YWN0LFxuICB9LFxufTtcbiJdfQ==