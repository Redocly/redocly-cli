"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIMediaTypeObject = exports.OpenAPIMediaObject = void 0;

var _OpenAPISchema = _interopRequireDefault(require("./OpenAPISchema"));

var _error = _interopRequireDefault(require("../error"));

var _OpenAPIExample = require("./OpenAPIExample");

var _OpenAPIEncoding = _interopRequireDefault(require("./OpenAPIEncoding"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-cycle */
const OpenAPIMediaObject = {
  validators: {
    schema() {
      return (node, ctx) => !node.schema ? (0, _error.default)('MediaType Object must include schema', node, ctx) : null;
    },

    example() {
      return (node, ctx) => {
        if (node.example && node.examples) {
          return (0, _error.default)('The example and examples fields are mutually exclusive', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    schema: _OpenAPISchema.default,
    examples: _OpenAPIExample.OpenAPIExampleMap,
    encoding: _OpenAPIEncoding.default
  }
};
exports.OpenAPIMediaObject = OpenAPIMediaObject;
const OpenAPIMediaTypeObject = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIMediaObject;
    });
    return props;
  }

};
exports.OpenAPIMediaTypeObject = OpenAPIMediaTypeObject;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElNZWRpYU9iamVjdC5qcyJdLCJuYW1lcyI6WyJPcGVuQVBJTWVkaWFPYmplY3QiLCJ2YWxpZGF0b3JzIiwic2NoZW1hIiwibm9kZSIsImN0eCIsImV4YW1wbGUiLCJleGFtcGxlcyIsInByb3BlcnRpZXMiLCJPcGVuQVBJU2NoZW1hIiwiT3BlbkFQSUV4YW1wbGVNYXAiLCJlbmNvZGluZyIsIk9wZW5BUElFbmNvZGluZyIsIk9wZW5BUElNZWRpYVR5cGVPYmplY3QiLCJwcm9wcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBSkE7QUFPTyxNQUFNQSxrQkFBa0IsR0FBRztBQUNoQ0MsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLE1BQU0sR0FBRztBQUNQLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWdCLENBQUNELElBQUksQ0FBQ0QsTUFBTixHQUFlLG9CQUFZLHNDQUFaLEVBQW9EQyxJQUFwRCxFQUEwREMsR0FBMUQsQ0FBZixHQUFnRixJQUF2RztBQUNELEtBSFM7O0FBSVZDLElBQUFBLE9BQU8sR0FBRztBQUNSLGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDRSxPQUFMLElBQWdCRixJQUFJLENBQUNHLFFBQXpCLEVBQW1DO0FBQ2pDLGlCQUFPLG9CQUFZLHdEQUFaLEVBQXNFSCxJQUF0RSxFQUE0RUMsR0FBNUUsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRDs7QUFYUyxHQURvQjtBQWNoQ0csRUFBQUEsVUFBVSxFQUFFO0FBQ1ZMLElBQUFBLE1BQU0sRUFBRU0sc0JBREU7QUFFVkYsSUFBQUEsUUFBUSxFQUFFRyxpQ0FGQTtBQUdWQyxJQUFBQSxRQUFRLEVBQUVDO0FBSEE7QUFkb0IsQ0FBM0I7O0FBcUJBLE1BQU1DLHNCQUFzQixHQUFHO0FBQ3BDTCxFQUFBQSxVQUFVLENBQUNKLElBQUQsRUFBTztBQUNmLFVBQU1VLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZWixJQUFaLEVBQWtCYSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CSixNQUFBQSxLQUFLLENBQUNJLENBQUQsQ0FBTCxHQUFXakIsa0JBQVg7QUFDRCxLQUZEO0FBR0EsV0FBT2EsS0FBUDtBQUNEOztBQVBtQyxDQUEvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9uby1jeWNsZSAqL1xuaW1wb3J0IE9wZW5BUElTY2hlbWEgZnJvbSAnLi9PcGVuQVBJU2NoZW1hJztcbmltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5pbXBvcnQgeyBPcGVuQVBJRXhhbXBsZU1hcCB9IGZyb20gJy4vT3BlbkFQSUV4YW1wbGUnO1xuaW1wb3J0IE9wZW5BUElFbmNvZGluZyBmcm9tICcuL09wZW5BUElFbmNvZGluZyc7XG5cblxuZXhwb3J0IGNvbnN0IE9wZW5BUElNZWRpYU9iamVjdCA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIHNjaGVtYSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiAoIW5vZGUuc2NoZW1hID8gY3JlYXRlRXJyb3IoJ01lZGlhVHlwZSBPYmplY3QgbXVzdCBpbmNsdWRlIHNjaGVtYScsIG5vZGUsIGN0eCkgOiBudWxsKTtcbiAgICB9LFxuICAgIGV4YW1wbGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5leGFtcGxlICYmIG5vZGUuZXhhbXBsZXMpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBleGFtcGxlIGFuZCBleGFtcGxlcyBmaWVsZHMgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZScsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBzY2hlbWE6IE9wZW5BUElTY2hlbWEsXG4gICAgZXhhbXBsZXM6IE9wZW5BUElFeGFtcGxlTWFwLFxuICAgIGVuY29kaW5nOiBPcGVuQVBJRW5jb2RpbmcsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSU1lZGlhVHlwZU9iamVjdCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElNZWRpYU9iamVjdDtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuIl19