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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZG9jdW1lbnQiLCJ5YW1sIiwic2FmZUxvYWQiLCJyZXN1bHQiLCJPcGVuQVBJUm9vdCIsImV4IiwidmFsaWRhdGVGcm9tRmlsZSIsImZOYW1lIiwiZG9jIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ2YWxpZGF0aW9uUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7QUFFTyxNQUFNQSxRQUFRLEdBQUlDLFFBQUQsSUFBYztBQUNwQyxNQUFJO0FBQ0YsVUFBTUMsUUFBUSxHQUFHQyxnQkFBS0MsUUFBTCxDQUFjSCxRQUFkLENBQWpCOztBQUNBLFVBQU1JLE1BQU0sR0FBRyx1QkFBU0gsUUFBVCxFQUFtQkksbUJBQW5CLEVBQWdDTCxRQUFoQyxDQUFmO0FBQ0EsV0FBT0ksTUFBUDtBQUNELEdBSkQsQ0FJRSxPQUFPRSxFQUFQLEVBQVc7QUFDWCxXQUFPLEVBQVA7QUFDRDtBQUNGLENBUk07Ozs7QUFVQSxNQUFNQyxnQkFBZ0IsR0FBSUMsS0FBRCxJQUFXO0FBQ3pDLFFBQU1DLEdBQUcsR0FBR0MsWUFBR0MsWUFBSCxDQUFnQkgsS0FBaEIsRUFBdUIsT0FBdkIsQ0FBWjs7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR2IsUUFBUSxDQUFDVSxHQUFELENBQWpDO0FBQ0EsU0FBT0csZ0JBQVA7QUFDRCxDQUpNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnLi90cmF2ZXJzZSc7XG5pbXBvcnQgT3BlbkFQSVJvb3QgZnJvbSAnLi92YWxpZGF0b3JzJztcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlID0gKHlhbWxEYXRhKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZG9jdW1lbnQgPSB5YW1sLnNhZmVMb2FkKHlhbWxEYXRhKTtcbiAgICBjb25zdCByZXN1bHQgPSB0cmF2ZXJzZShkb2N1bWVudCwgT3BlbkFQSVJvb3QsIHlhbWxEYXRhKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlRnJvbUZpbGUgPSAoZk5hbWUpID0+IHtcbiAgY29uc3QgZG9jID0gZnMucmVhZEZpbGVTeW5jKGZOYW1lLCAndXRmLTgnKTtcbiAgY29uc3QgdmFsaWRhdGlvblJlc3VsdCA9IHZhbGlkYXRlKGRvYyk7XG4gIHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xufTtcbiJdfQ==