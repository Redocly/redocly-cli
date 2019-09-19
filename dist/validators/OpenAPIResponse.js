"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIResponseMap = exports.OpenAPIResponse = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIMediaObject = require("./OpenAPIMediaObject");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIResponse = {
  validators: {
    description() {
      return (node, ctx) => !node.description ? (0, _error.default)('Description is required part of a Response definition.', node, ctx) : null;
    }

  },
  properties: {
    content: _OpenAPIMediaObject.OpenAPIMediaTypeObject
  }
};
exports.OpenAPIResponse = OpenAPIResponse;
const OpenAPIResponseMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIResponse;
    });
    return props;
  }

};
exports.OpenAPIResponseMap = OpenAPIResponseMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElSZXNwb25zZS5qcyJdLCJuYW1lcyI6WyJPcGVuQVBJUmVzcG9uc2UiLCJ2YWxpZGF0b3JzIiwiZGVzY3JpcHRpb24iLCJub2RlIiwiY3R4IiwicHJvcGVydGllcyIsImNvbnRlbnQiLCJPcGVuQVBJTWVkaWFUeXBlT2JqZWN0IiwiT3BlbkFQSVJlc3BvbnNlTWFwIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7OztBQUVPLE1BQU1BLGVBQWUsR0FBRztBQUM3QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWdCLENBQUNELElBQUksQ0FBQ0QsV0FBTixHQUFvQixvQkFBWSx3REFBWixFQUFzRUMsSUFBdEUsRUFBNEVDLEdBQTVFLENBQXBCLEdBQXVHLElBQTlIO0FBQ0Q7O0FBSFMsR0FEaUI7QUFNN0JDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxPQUFPLEVBQUVDO0FBREM7QUFOaUIsQ0FBeEI7O0FBV0EsTUFBTUMsa0JBQWtCLEdBQUc7QUFDaENILEVBQUFBLFVBQVUsQ0FBQ0YsSUFBRCxFQUFPO0FBQ2YsVUFBTU0sS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlSLElBQVosRUFBa0JTLE9BQWxCLENBQTJCQyxDQUFELElBQU87QUFDL0JKLE1BQUFBLEtBQUssQ0FBQ0ksQ0FBRCxDQUFMLEdBQVdiLGVBQVg7QUFDRCxLQUZEO0FBR0EsV0FBT1MsS0FBUDtBQUNEOztBQVArQixDQUEzQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmltcG9ydCB7IE9wZW5BUElNZWRpYVR5cGVPYmplY3QgfSBmcm9tICcuL09wZW5BUElNZWRpYU9iamVjdCc7XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJUmVzcG9uc2UgPSB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUuZGVzY3JpcHRpb24gPyBjcmVhdGVFcnJvcignRGVzY3JpcHRpb24gaXMgcmVxdWlyZWQgcGFydCBvZiBhIFJlc3BvbnNlIGRlZmluaXRpb24uJywgbm9kZSwgY3R4KSA6IG51bGwpO1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb250ZW50OiBPcGVuQVBJTWVkaWFUeXBlT2JqZWN0LFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElSZXNwb25zZU1hcCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElSZXNwb25zZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19