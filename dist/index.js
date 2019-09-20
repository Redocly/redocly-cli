"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateFromFile = exports.validate = void 0;

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _fs = _interopRequireDefault(require("fs"));

var _traverse = _interopRequireDefault(require("./traverse"));

var _validators = _interopRequireDefault(require("./validators"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const validate = yamlData => {
  try {
    const document = _jsYaml.default.safeLoad(yamlData);

    const result = (0, _traverse.default)(document, _validators.default, yamlData);
    return result;
  } catch (ex) {
    // console.log('invalid yaml');
    return [];
  }
};

exports.validate = validate;

const validateFromFile = fName => {
  const doc = _fs.default.readFileSync(fName, 'utf-8');

  const validationResult = validate(doc);
  return validationResult;
};

exports.validateFromFile = validateFromFile;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZG9jdW1lbnQiLCJ5YW1sIiwic2FmZUxvYWQiLCJyZXN1bHQiLCJPcGVuQVBJUm9vdCIsImV4IiwidmFsaWRhdGVGcm9tRmlsZSIsImZOYW1lIiwiZG9jIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ2YWxpZGF0aW9uUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7QUFFTyxNQUFNQSxRQUFRLEdBQUlDLFFBQUQsSUFBYztBQUNwQyxNQUFJO0FBQ0YsVUFBTUMsUUFBUSxHQUFHQyxnQkFBS0MsUUFBTCxDQUFjSCxRQUFkLENBQWpCOztBQUNBLFVBQU1JLE1BQU0sR0FBRyx1QkFBU0gsUUFBVCxFQUFtQkksbUJBQW5CLEVBQWdDTCxRQUFoQyxDQUFmO0FBQ0EsV0FBT0ksTUFBUDtBQUNELEdBSkQsQ0FJRSxPQUFPRSxFQUFQLEVBQVc7QUFDWDtBQUNBLFdBQU8sRUFBUDtBQUNEO0FBQ0YsQ0FUTTs7OztBQVdBLE1BQU1DLGdCQUFnQixHQUFJQyxLQUFELElBQVc7QUFDekMsUUFBTUMsR0FBRyxHQUFHQyxZQUFHQyxZQUFILENBQWdCSCxLQUFoQixFQUF1QixPQUF2QixDQUFaOztBQUNBLFFBQU1JLGdCQUFnQixHQUFHYixRQUFRLENBQUNVLEdBQUQsQ0FBakM7QUFDQSxTQUFPRyxnQkFBUDtBQUNELENBSk0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCB0cmF2ZXJzZSBmcm9tICcuL3RyYXZlcnNlJztcbmltcG9ydCBPcGVuQVBJUm9vdCBmcm9tICcuL3ZhbGlkYXRvcnMnO1xuXG5leHBvcnQgY29uc3QgdmFsaWRhdGUgPSAoeWFtbERhdGEpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkb2N1bWVudCA9IHlhbWwuc2FmZUxvYWQoeWFtbERhdGEpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRyYXZlcnNlKGRvY3VtZW50LCBPcGVuQVBJUm9vdCwgeWFtbERhdGEpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2ludmFsaWQgeWFtbCcpO1xuICAgIHJldHVybiBbXTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlRnJvbUZpbGUgPSAoZk5hbWUpID0+IHtcbiAgY29uc3QgZG9jID0gZnMucmVhZEZpbGVTeW5jKGZOYW1lLCAndXRmLTgnKTtcbiAgY29uc3QgdmFsaWRhdGlvblJlc3VsdCA9IHZhbGlkYXRlKGRvYyk7XG4gIHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xufTtcbiJdfQ==