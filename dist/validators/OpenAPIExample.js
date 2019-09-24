"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIExampleMap = exports.OpenAPIExample = void 0;

var _error = require("../error");

const OpenAPIExample = {
  validators: {
    value() {
      return (node, ctx) => {
        if (node.value && node.externalValue) {
          return (0, _error.createErrorMutuallyExclusiveFields)(['value', 'externalValue'], node, ctx);
        }

        return null;
      };
    },

    externalValue() {
      return (node, ctx) => {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        if (node.value && node.externalValue) {
          return (0, _error.createErrorMutuallyExclusiveFields)(['value', 'externalValue'], node, ctx);
        }

        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') {
          return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        return null;
      };
    },

    summary() {
      return (node, ctx) => {
        if (node.summary && typeof node.summary !== 'string') {
          return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        }

        return null;
      };
    }

  }
};
exports.OpenAPIExample = OpenAPIExample;
const OpenAPIExampleMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIExample;
    });
    return props;
  }

};
exports.OpenAPIExampleMap = OpenAPIExampleMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElFeGFtcGxlLmpzIl0sIm5hbWVzIjpbIk9wZW5BUElFeGFtcGxlIiwidmFsaWRhdG9ycyIsInZhbHVlIiwibm9kZSIsImN0eCIsImV4dGVybmFsVmFsdWUiLCJkZXNjcmlwdGlvbiIsInN1bW1hcnkiLCJPcGVuQVBJRXhhbXBsZU1hcCIsInByb3BlcnRpZXMiLCJwcm9wcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUVPLE1BQU1BLGNBQWMsR0FBRztBQUM1QkMsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLEtBQUssR0FBRztBQUNOLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDRCxLQUFMLElBQWNDLElBQUksQ0FBQ0UsYUFBdkIsRUFBc0M7QUFDcEMsaUJBQU8sK0NBQW1DLENBQUMsT0FBRCxFQUFVLGVBQVYsQ0FBbkMsRUFBK0RGLElBQS9ELEVBQXFFQyxHQUFyRSxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1ELEtBUlM7O0FBU1ZDLElBQUFBLGFBQWEsR0FBRztBQUNkLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDRSxhQUFMLElBQXNCLE9BQU9GLElBQUksQ0FBQ0UsYUFBWixLQUE4QixRQUF4RCxFQUFrRTtBQUNoRSxpQkFBTywwQ0FBOEIsUUFBOUIsRUFBd0NGLElBQXhDLEVBQThDQyxHQUE5QyxDQUFQO0FBQ0Q7O0FBQ0QsWUFBSUQsSUFBSSxDQUFDRCxLQUFMLElBQWNDLElBQUksQ0FBQ0UsYUFBdkIsRUFBc0M7QUFDcEMsaUJBQU8sK0NBQW1DLENBQUMsT0FBRCxFQUFVLGVBQVYsQ0FBbkMsRUFBK0RGLElBQS9ELEVBQXFFQyxHQUFyRSxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FSRDtBQVNELEtBbkJTOztBQW9CVkUsSUFBQUEsV0FBVyxHQUFHO0FBQ1osYUFBTyxDQUFDSCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNHLFdBQUwsSUFBb0IsT0FBT0gsSUFBSSxDQUFDRyxXQUFaLEtBQTRCLFFBQXBELEVBQThEO0FBQzVELGlCQUFPLDBDQUE4QixRQUE5QixFQUF3Q0gsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQUxEO0FBTUQsS0EzQlM7O0FBNEJWRyxJQUFBQSxPQUFPLEdBQUc7QUFDUixhQUFPLENBQUNKLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0ksT0FBTCxJQUFnQixPQUFPSixJQUFJLENBQUNJLE9BQVosS0FBd0IsUUFBNUMsRUFBc0Q7QUFDcEQsaUJBQU8sMENBQThCLFFBQTlCLEVBQXdDSixJQUF4QyxFQUE4Q0MsR0FBOUMsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRDs7QUFuQ1M7QUFEZ0IsQ0FBdkI7O0FBd0NBLE1BQU1JLGlCQUFpQixHQUFHO0FBQy9CQyxFQUFBQSxVQUFVLENBQUNOLElBQUQsRUFBTztBQUNmLFVBQU1PLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZVCxJQUFaLEVBQWtCVSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CSixNQUFBQSxLQUFLLENBQUNJLENBQUQsQ0FBTCxHQUFXZCxjQUFYO0FBQ0QsS0FGRDtBQUdBLFdBQU9VLEtBQVA7QUFDRDs7QUFQOEIsQ0FBMUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCwgY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyB9IGZyb20gJy4uL2Vycm9yJztcblxuZXhwb3J0IGNvbnN0IE9wZW5BUElFeGFtcGxlID0ge1xuICB2YWxpZGF0b3JzOiB7XG4gICAgdmFsdWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS52YWx1ZSAmJiBub2RlLmV4dGVybmFsVmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyhbJ3ZhbHVlJywgJ2V4dGVybmFsVmFsdWUnXSwgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleHRlcm5hbFZhbHVlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuZXh0ZXJuYWxWYWx1ZSAmJiB0eXBlb2Ygbm9kZS5leHRlcm5hbFZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS52YWx1ZSAmJiBub2RlLmV4dGVybmFsVmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyhbJ3ZhbHVlJywgJ2V4dGVybmFsVmFsdWUnXSwgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbigpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzdW1tYXJ5KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuc3VtbWFyeSAmJiB0eXBlb2Ygbm9kZS5zdW1tYXJ5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBPcGVuQVBJRXhhbXBsZU1hcCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElFeGFtcGxlO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9wcztcbiAgfSxcbn07XG4iXX0=