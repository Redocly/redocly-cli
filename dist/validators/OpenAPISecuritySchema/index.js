"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _OpenAPISecuritySchema = _interopRequireDefault(require("./OpenAPISecuritySchema"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = _OpenAPISecuritySchema.default;
    });
    return props;
  }

};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9pbmRleC5qcyJdLCJuYW1lcyI6WyJwcm9wZXJ0aWVzIiwibm9kZSIsInByb3BzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrIiwiT3BlbkFQSVNlY3VyaXR5U2NoZW1hIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxVQUFVLENBQUNDLElBQUQsRUFBTztBQUNmLFVBQU1DLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxJQUFaLEVBQWtCSSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CSixNQUFBQSxLQUFLLENBQUNJLENBQUQsQ0FBTCxHQUFXQyw4QkFBWDtBQUNELEtBRkQ7QUFHQSxXQUFPTCxLQUFQO0FBQ0Q7O0FBUFksQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBPcGVuQVBJU2VjdXJpdHlTY2hlbWEgZnJvbSAnLi9PcGVuQVBJU2VjdXJpdHlTY2hlbWEnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHByb3BlcnRpZXMobm9kZSkge1xuICAgIGNvbnN0IHByb3BzID0ge307XG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgcHJvcHNba10gPSBPcGVuQVBJU2VjdXJpdHlTY2hlbWE7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb3BzO1xuICB9LFxufTtcbiJdfQ==