"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.createErrorMutuallyExclusiveFields = exports.createErrrorFieldTypeMismatch = exports.createErrorMissingRequiredField = exports.createErrorFieldNotAllowed = void 0;

var _default2 = _interopRequireDefault(require("./default"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const createErrorFieldNotAllowed = (fieldName, node, ctx) => (0, _default2.default)(`${fieldName} is not allowed here. Use "x-" prefix to override this behavior`, node, ctx, 'key');

exports.createErrorFieldNotAllowed = createErrorFieldNotAllowed;

const createErrorMissingRequiredField = (fieldName, node, ctx) => (0, _default2.default)(`The field "${fieldName}" must be present on this level`, node, ctx, 'key');

exports.createErrorMissingRequiredField = createErrorMissingRequiredField;

const createErrrorFieldTypeMismatch = (desiredType, node, ctx) => (0, _default2.default)(`This field must be of ${desiredType} type`, node, ctx, 'key');

exports.createErrrorFieldTypeMismatch = createErrrorFieldTypeMismatch;

const createErrorMutuallyExclusiveFields = (fieldNames, node, ctx) => (0, _default2.default)(`${fieldNames.join(', ')} are mutually exclusive`, node, ctx, 'key');

exports.createErrorMutuallyExclusiveFields = createErrorMutuallyExclusiveFields;
var _default = _default2.default;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lcnJvci9pbmRleC5qcyJdLCJuYW1lcyI6WyJjcmVhdGVFcnJvckZpZWxkTm90QWxsb3dlZCIsImZpZWxkTmFtZSIsIm5vZGUiLCJjdHgiLCJjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkIiwiY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2giLCJkZXNpcmVkVHlwZSIsImNyZWF0ZUVycm9yTXV0dWFsbHlFeGNsdXNpdmVGaWVsZHMiLCJmaWVsZE5hbWVzIiwiam9pbiIsImNyZWF0ZUVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7QUFFTyxNQUFNQSwwQkFBMEIsR0FBRyxDQUFDQyxTQUFELEVBQVlDLElBQVosRUFBa0JDLEdBQWxCLEtBQTBCLHVCQUNqRSxHQUFFRixTQUFVLGlFQURxRCxFQUNhQyxJQURiLEVBQ21CQyxHQURuQixFQUN3QixLQUR4QixDQUE3RDs7OztBQUlBLE1BQU1DLCtCQUErQixHQUFHLENBQUNILFNBQUQsRUFBWUMsSUFBWixFQUFrQkMsR0FBbEIsS0FBMEIsdUJBQ3RFLGNBQWFGLFNBQVUsaUNBRCtDLEVBQ2JDLElBRGEsRUFDUEMsR0FETyxFQUNGLEtBREUsQ0FBbEU7Ozs7QUFJQSxNQUFNRSw2QkFBNkIsR0FBRyxDQUFDQyxXQUFELEVBQWNKLElBQWQsRUFBb0JDLEdBQXBCLEtBQTRCLHVCQUN0RSx5QkFBd0JHLFdBQVksT0FEa0MsRUFDMUJKLElBRDBCLEVBQ3BCQyxHQURvQixFQUNmLEtBRGUsQ0FBbEU7Ozs7QUFJQSxNQUFNSSxrQ0FBa0MsR0FBRyxDQUFDQyxVQUFELEVBQWFOLElBQWIsRUFBbUJDLEdBQW5CLEtBQTJCLHVCQUMxRSxHQUFFSyxVQUFVLENBQUNDLElBQVgsQ0FBZ0IsSUFBaEIsQ0FBc0IseUJBRGtELEVBQ3hCUCxJQUR3QixFQUNsQkMsR0FEa0IsRUFDYixLQURhLENBQXRFOzs7ZUFJUU8saUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi9kZWZhdWx0JztcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkID0gKGZpZWxkTmFtZSwgbm9kZSwgY3R4KSA9PiBjcmVhdGVFcnJvcihcbiAgYCR7ZmllbGROYW1lfSBpcyBub3QgYWxsb3dlZCBoZXJlLiBVc2UgXCJ4LVwiIHByZWZpeCB0byBvdmVycmlkZSB0aGlzIGJlaGF2aW9yYCwgbm9kZSwgY3R4LCAna2V5Jyxcbik7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkID0gKGZpZWxkTmFtZSwgbm9kZSwgY3R4KSA9PiBjcmVhdGVFcnJvcihcbiAgYFRoZSBmaWVsZCBcIiR7ZmllbGROYW1lfVwiIG11c3QgYmUgcHJlc2VudCBvbiB0aGlzIGxldmVsYCwgbm9kZSwgY3R4LCAna2V5Jyxcbik7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCA9IChkZXNpcmVkVHlwZSwgbm9kZSwgY3R4KSA9PiBjcmVhdGVFcnJvcihcbiAgYFRoaXMgZmllbGQgbXVzdCBiZSBvZiAke2Rlc2lyZWRUeXBlfSB0eXBlYCwgbm9kZSwgY3R4LCAna2V5Jyxcbik7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzID0gKGZpZWxkTmFtZXMsIG5vZGUsIGN0eCkgPT4gY3JlYXRlRXJyb3IoXG4gIGAke2ZpZWxkTmFtZXMuam9pbignLCAnKX0gYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZWAsIG5vZGUsIGN0eCwgJ2tleScsXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVFcnJvcjtcbiJdfQ==