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
  const document = _jsYaml.default.safeLoad(yamlData);

  const result = (0, _traverse.default)(document, _validators.default, yamlData);
  return result;
};

exports.validate = validate;

const validateFromFile = fName => {
  const doc = _fs.default.readFileSync(fName, 'utf-8');

  const validationResult = validate(doc);
  return validationResult;
};

exports.validateFromFile = validateFromFile;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZG9jdW1lbnQiLCJ5YW1sIiwic2FmZUxvYWQiLCJyZXN1bHQiLCJPcGVuQVBJUm9vdCIsInZhbGlkYXRlRnJvbUZpbGUiLCJmTmFtZSIsImRvYyIsImZzIiwicmVhZEZpbGVTeW5jIiwidmFsaWRhdGlvblJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUVBOztBQUNBOzs7O0FBRU8sTUFBTUEsUUFBUSxHQUFJQyxRQUFELElBQWM7QUFDcEMsUUFBTUMsUUFBUSxHQUFHQyxnQkFBS0MsUUFBTCxDQUFjSCxRQUFkLENBQWpCOztBQUNBLFFBQU1JLE1BQU0sR0FBRyx1QkFBU0gsUUFBVCxFQUFtQkksbUJBQW5CLEVBQWdDTCxRQUFoQyxDQUFmO0FBQ0EsU0FBT0ksTUFBUDtBQUNELENBSk07Ozs7QUFNQSxNQUFNRSxnQkFBZ0IsR0FBSUMsS0FBRCxJQUFXO0FBQ3pDLFFBQU1DLEdBQUcsR0FBR0MsWUFBR0MsWUFBSCxDQUFnQkgsS0FBaEIsRUFBdUIsT0FBdkIsQ0FBWjs7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR1osUUFBUSxDQUFDUyxHQUFELENBQWpDO0FBQ0EsU0FBT0csZ0JBQVA7QUFDRCxDQUpNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnLi90cmF2ZXJzZSc7XG5pbXBvcnQgT3BlbkFQSVJvb3QgZnJvbSAnLi92YWxpZGF0b3JzJztcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlID0gKHlhbWxEYXRhKSA9PiB7XG4gIGNvbnN0IGRvY3VtZW50ID0geWFtbC5zYWZlTG9hZCh5YW1sRGF0YSk7XG4gIGNvbnN0IHJlc3VsdCA9IHRyYXZlcnNlKGRvY3VtZW50LCBPcGVuQVBJUm9vdCwgeWFtbERhdGEpO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlRnJvbUZpbGUgPSAoZk5hbWUpID0+IHtcbiAgY29uc3QgZG9jID0gZnMucmVhZEZpbGVTeW5jKGZOYW1lLCAndXRmLTgnKTtcbiAgY29uc3QgdmFsaWRhdGlvblJlc3VsdCA9IHZhbGlkYXRlKGRvYyk7XG4gIHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xufTtcbiJdfQ==