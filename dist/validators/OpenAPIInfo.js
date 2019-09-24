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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElJbmZvLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaWNlbnNlIiwidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwidXJsIiwiT3BlbkFQSUNvbnRhY3QiLCJlbWFpbCIsIk9wZW5BUElJbmZvIiwidGl0bGUiLCJ2ZXJzaW9uIiwiZGVzY3JpcHRpb24iLCJ0ZXJtc09mU2VydmljZSIsInByb3BlcnRpZXMiLCJsaWNlbnNlIiwiY29udGFjdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7Ozs7QUFFTyxNQUFNQSxjQUFjLEdBQUc7QUFDNUJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFnQixDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRCxJQUFmLEdBQXNCLDRDQUFnQyxNQUFoQyxFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQXRCLEdBQTJFLElBQWxHO0FBQ0QsS0FIUzs7QUFJVkMsSUFBQUEsR0FBRyxHQUFHO0FBQ0osYUFBTyxDQUFDRixJQUFELEVBQU9DLEdBQVAsS0FBZ0JELElBQUksSUFBSUEsSUFBSSxDQUFDRSxHQUFiLElBQW9CLENBQUMsa0JBQU1GLElBQUksQ0FBQ0UsR0FBWCxDQUFyQixHQUF1QyxvQkFBWSxtQ0FBWixFQUFpREYsSUFBakQsRUFBdURDLEdBQXZELENBQXZDLEdBQXFHLElBQTVIO0FBQ0Q7O0FBTlM7QUFEZ0IsQ0FBdkI7O0FBV0EsTUFBTUUsY0FBYyxHQUFHO0FBQzVCTCxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBaUJELElBQUksSUFBSUEsSUFBSSxDQUFDRCxJQUFkLElBQXVCLE9BQU9DLElBQUksQ0FBQ0QsSUFBWixLQUFxQixRQUE1QyxHQUF1RCwwQ0FBOEIsUUFBOUIsRUFBd0NDLElBQXhDLEVBQThDQyxHQUE5QyxDQUF2RCxHQUE0RyxJQUFuSTtBQUNELEtBSFM7O0FBSVZDLElBQUFBLEdBQUcsR0FBRztBQUNKLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWlCRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsR0FBZCxJQUFzQixPQUFPRixJQUFJLENBQUNFLEdBQVosS0FBb0IsUUFBMUMsR0FBcUQsMENBQThCLFFBQTlCLEVBQXdDRixJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FBckQsR0FBMEcsSUFBakk7QUFDRCxLQU5TOztBQU9WRyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPLENBQUNKLElBQUQsRUFBT0MsR0FBUCxLQUFpQkQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLEdBQWQsSUFBc0IsT0FBT0YsSUFBSSxDQUFDRSxHQUFaLEtBQW9CLFFBQTFDLEdBQXFELDBDQUE4QixRQUE5QixFQUF3Q0YsSUFBeEMsRUFBOENDLEdBQTlDLENBQXJELEdBQTBHLElBQWpJO0FBQ0Q7O0FBVFM7QUFEZ0IsQ0FBdkI7O0FBY0EsTUFBTUksV0FBVyxHQUFHO0FBQ3pCUCxFQUFBQSxVQUFVLEVBQUU7QUFDVlEsSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTyxDQUFDTixJQUFELEVBQU9DLEdBQVAsS0FBZ0IsQ0FBQ0QsSUFBRCxJQUFTLENBQUNBLElBQUksQ0FBQ00sS0FBZixHQUF1Qiw0Q0FBZ0MsT0FBaEMsRUFBeUNOLElBQXpDLEVBQStDQyxHQUEvQyxDQUF2QixHQUE2RSxJQUFwRztBQUNELEtBSFM7O0FBSVZNLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ1AsSUFBRCxFQUFPQyxHQUFQLEtBQWdCLENBQUNELElBQUQsSUFBUyxDQUFDQSxJQUFJLENBQUNPLE9BQWYsR0FBeUIsNENBQWdDLFNBQWhDLEVBQTJDUCxJQUEzQyxFQUFpREMsR0FBakQsQ0FBekIsR0FBaUYsSUFBeEc7QUFDRCxLQU5TOztBQU9WTyxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLE1BQU0sSUFBYjtBQUNELEtBVFM7O0FBVVZDLElBQUFBLGNBQWMsR0FBRztBQUNmLGFBQU8sTUFBTSxJQUFiO0FBQ0Q7O0FBWlMsR0FEYTtBQWV6QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE9BQU8sRUFBRWQsY0FEQztBQUVWZSxJQUFBQSxPQUFPLEVBQUVUO0FBRkM7QUFmYSxDQUFwQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciwgeyBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkLCBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCB9IGZyb20gJy4uL2Vycm9yJztcbmltcG9ydCB7IGlzVXJsIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUxpY2Vuc2UgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBuYW1lKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICghbm9kZSB8fCAhbm9kZS5uYW1lID8gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgnbmFtZScsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIHVybCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAobm9kZSAmJiBub2RlLnVybCAmJiAhaXNVcmwobm9kZS51cmwpID8gY3JlYXRlRXJyb3IoJ1RoZSB1cmwgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVSTCcsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElDb250YWN0ID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgbmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoKG5vZGUgJiYgbm9kZS5uYW1lKSAmJiB0eXBlb2Ygbm9kZS5uYW1lICE9PSAnc3RyaW5nJyA/IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICB1cmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKChub2RlICYmIG5vZGUudXJsKSAmJiB0eXBlb2Ygbm9kZS51cmwgIT09ICdzdHJpbmcnID8gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIGVtYWlsKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICgobm9kZSAmJiBub2RlLnVybCkgJiYgdHlwZW9mIG5vZGUudXJsICE9PSAnc3RyaW5nJyA/IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKCdzdHJpbmcnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJSW5mbyA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHRpdGxlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICghbm9kZSB8fCAhbm9kZS50aXRsZSA/IGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ3RpdGxlJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gICAgdmVyc2lvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUgfHwgIW5vZGUudmVyc2lvbiA/IGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ3ZlcnNpb24nLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAoKSA9PiBudWxsO1xuICAgIH0sXG4gICAgdGVybXNPZlNlcnZpY2UoKSB7XG4gICAgICByZXR1cm4gKCkgPT4gbnVsbDtcbiAgICB9LFxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbGljZW5zZTogT3BlbkFQSUxpY2Vuc2UsXG4gICAgY29udGFjdDogT3BlbkFQSUNvbnRhY3QsXG4gIH0sXG59O1xuIl19