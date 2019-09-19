"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _OpenAPISchema = _interopRequireDefault(require("./OpenAPISchema"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable import/no-cycle */
const OpenAPISchemaMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = _OpenAPISchema.default;
    });
    return props;
  }

};
var _default = OpenAPISchemaMap;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTY2hlbWFNYXAuanMiXSwibmFtZXMiOlsiT3BlbkFQSVNjaGVtYU1hcCIsInByb3BlcnRpZXMiLCJub2RlIiwicHJvcHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImsiLCJPcGVuQVBJU2NoZW1hIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7Ozs7QUFEQTtBQUdBLE1BQU1BLGdCQUFnQixHQUFHO0FBQ3ZCQyxFQUFBQSxVQUFVLENBQUNDLElBQUQsRUFBTztBQUNmLFVBQU1DLEtBQUssR0FBRyxFQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxJQUFaLEVBQWtCSSxPQUFsQixDQUEyQkMsQ0FBRCxJQUFPO0FBQy9CSixNQUFBQSxLQUFLLENBQUNJLENBQUQsQ0FBTCxHQUFXQyxzQkFBWDtBQUNELEtBRkQ7QUFHQSxXQUFPTCxLQUFQO0FBQ0Q7O0FBUHNCLENBQXpCO2VBVWVILGdCIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWN5Y2xlICovXG5pbXBvcnQgT3BlbkFQSVNjaGVtYSBmcm9tICcuL09wZW5BUElTY2hlbWEnO1xuXG5jb25zdCBPcGVuQVBJU2NoZW1hTWFwID0ge1xuICBwcm9wZXJ0aWVzKG5vZGUpIHtcbiAgICBjb25zdCBwcm9wcyA9IHt9O1xuICAgIE9iamVjdC5rZXlzKG5vZGUpLmZvckVhY2goKGspID0+IHtcbiAgICAgIHByb3BzW2tdID0gT3BlbkFQSVNjaGVtYTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJvcHM7XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBPcGVuQVBJU2NoZW1hTWFwO1xuIl19