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
      return (node, ctx) => !node || !node.name ? (0, _error.default)('Name is required for the license object', node, ctx) : null;
    }

  }
};
exports.OpenAPILicense = OpenAPILicense;
const OpenAPIInfo = {
  validators: {
    title() {
      return (node, ctx) => !node || !node.title ? (0, _error.default)('Info section must include title', node, ctx) : null;
    }

  },
  properties: {
    license: OpenAPILicense
  }
};
exports.OpenAPIInfo = OpenAPIInfo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElJbmZvLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElMaWNlbnNlIiwidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwiT3BlbkFQSUluZm8iLCJ0aXRsZSIsInByb3BlcnRpZXMiLCJsaWNlbnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7QUFFTyxNQUFNQSxjQUFjLEdBQUc7QUFDNUJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFnQixDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRCxJQUFmLEdBQXNCLG9CQUFZLHlDQUFaLEVBQXVEQyxJQUF2RCxFQUE2REMsR0FBN0QsQ0FBdEIsR0FBMEYsSUFBakg7QUFDRDs7QUFIUztBQURnQixDQUF2Qjs7QUFRQSxNQUFNQyxXQUFXLEdBQUc7QUFDekJKLEVBQUFBLFVBQVUsRUFBRTtBQUNWSyxJQUFBQSxLQUFLLEdBQUc7QUFDTixhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFnQixDQUFDRCxJQUFELElBQVMsQ0FBQ0EsSUFBSSxDQUFDRyxLQUFmLEdBQXVCLG9CQUFZLGlDQUFaLEVBQStDSCxJQUEvQyxFQUFxREMsR0FBckQsQ0FBdkIsR0FBbUYsSUFBMUc7QUFDRDs7QUFIUyxHQURhO0FBTXpCRyxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsT0FBTyxFQUFFUjtBQURDO0FBTmEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSUxpY2Vuc2UgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBuYW1lKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+ICghbm9kZSB8fCAhbm9kZS5uYW1lID8gY3JlYXRlRXJyb3IoJ05hbWUgaXMgcmVxdWlyZWQgZm9yIHRoZSBsaWNlbnNlIG9iamVjdCcsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElJbmZvID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgdGl0bGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4gKCFub2RlIHx8ICFub2RlLnRpdGxlID8gY3JlYXRlRXJyb3IoJ0luZm8gc2VjdGlvbiBtdXN0IGluY2x1ZGUgdGl0bGUnLCBub2RlLCBjdHgpIDogbnVsbCk7XG4gICAgfSxcbiAgfSxcbiAgcHJvcGVydGllczoge1xuICAgIGxpY2Vuc2U6IE9wZW5BUElMaWNlbnNlLFxuICB9LFxufTtcbiJdfQ==