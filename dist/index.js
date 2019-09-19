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
    console.log('invalid yaml');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZG9jdW1lbnQiLCJ5YW1sIiwic2FmZUxvYWQiLCJyZXN1bHQiLCJPcGVuQVBJUm9vdCIsImV4IiwiY29uc29sZSIsImxvZyIsInZhbGlkYXRlRnJvbUZpbGUiLCJmTmFtZSIsImRvYyIsImZzIiwicmVhZEZpbGVTeW5jIiwidmFsaWRhdGlvblJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUVBOztBQUNBOzs7O0FBRU8sTUFBTUEsUUFBUSxHQUFJQyxRQUFELElBQWM7QUFDcEMsTUFBSTtBQUNGLFVBQU1DLFFBQVEsR0FBR0MsZ0JBQUtDLFFBQUwsQ0FBY0gsUUFBZCxDQUFqQjs7QUFDQSxVQUFNSSxNQUFNLEdBQUcsdUJBQVNILFFBQVQsRUFBbUJJLG1CQUFuQixFQUFnQ0wsUUFBaEMsQ0FBZjtBQUNBLFdBQU9JLE1BQVA7QUFDRCxHQUpELENBSUUsT0FBT0UsRUFBUCxFQUFXO0FBQ1hDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGNBQVo7QUFDQSxXQUFPLEVBQVA7QUFDRDtBQUNGLENBVE07Ozs7QUFXQSxNQUFNQyxnQkFBZ0IsR0FBSUMsS0FBRCxJQUFXO0FBQ3pDLFFBQU1DLEdBQUcsR0FBR0MsWUFBR0MsWUFBSCxDQUFnQkgsS0FBaEIsRUFBdUIsT0FBdkIsQ0FBWjs7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR2YsUUFBUSxDQUFDWSxHQUFELENBQWpDO0FBQ0EsU0FBT0csZ0JBQVA7QUFDRCxDQUpNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnLi90cmF2ZXJzZSc7XG5pbXBvcnQgT3BlbkFQSVJvb3QgZnJvbSAnLi92YWxpZGF0b3JzJztcblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlID0gKHlhbWxEYXRhKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZG9jdW1lbnQgPSB5YW1sLnNhZmVMb2FkKHlhbWxEYXRhKTtcbiAgICBjb25zdCByZXN1bHQgPSB0cmF2ZXJzZShkb2N1bWVudCwgT3BlbkFQSVJvb3QsIHlhbWxEYXRhKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKCdpbnZhbGlkIHlhbWwnKTtcbiAgICByZXR1cm4gW107XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUZyb21GaWxlID0gKGZOYW1lKSA9PiB7XG4gIGNvbnN0IGRvYyA9IGZzLnJlYWRGaWxlU3luYyhmTmFtZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IHZhbGlkYXRpb25SZXN1bHQgPSB2YWxpZGF0ZShkb2MpO1xuICByZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcbn07XG4iXX0=