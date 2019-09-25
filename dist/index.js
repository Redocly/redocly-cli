"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateFromFile = exports.validate = void 0;

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _fs = _interopRequireDefault(require("fs"));

var _traverse = _interopRequireDefault(require("./traverse"));

var _validators = _interopRequireDefault(require("./validators"));

var _cli = _interopRequireDefault(require("./cli"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const validate = (yamlData, filePath) => {
  let document;

  try {
    document = _jsYaml.default.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  const result = (0, _traverse.default)(document, _validators.default, yamlData, filePath);
  return result;
};

exports.validate = validate;

const validateFromFile = fName => {
  const resolvedFileName = fName; // path.resolve(fName);

  const doc = _fs.default.readFileSync(resolvedFileName, 'utf-8');

  const validationResult = validate(doc, resolvedFileName);
  return validationResult;
};

exports.validateFromFile = validateFromFile;

if (typeof require !== 'undefined' && require.main === module) {
  (0, _cli.default)();
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZmlsZVBhdGgiLCJkb2N1bWVudCIsInlhbWwiLCJzYWZlTG9hZCIsImV4IiwiRXJyb3IiLCJyZXN1bHQiLCJPcGVuQVBJUm9vdCIsInZhbGlkYXRlRnJvbUZpbGUiLCJmTmFtZSIsInJlc29sdmVkRmlsZU5hbWUiLCJkb2MiLCJmcyIsInJlYWRGaWxlU3luYyIsInZhbGlkYXRpb25SZXN1bHQiLCJyZXF1aXJlIiwibWFpbiIsIm1vZHVsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUVBOztBQUNBOztBQUNBOzs7O0FBRU8sTUFBTUEsUUFBUSxHQUFHLENBQUNDLFFBQUQsRUFBV0MsUUFBWCxLQUF3QjtBQUM5QyxNQUFJQyxRQUFKOztBQUNBLE1BQUk7QUFDRkEsSUFBQUEsUUFBUSxHQUFHQyxnQkFBS0MsUUFBTCxDQUFjSixRQUFkLENBQVg7QUFDRCxHQUZELENBRUUsT0FBT0ssRUFBUCxFQUFXO0FBQ1gsVUFBTSxJQUFJQyxLQUFKLENBQVUsc0JBQVYsQ0FBTjtBQUNEOztBQUNELFFBQU1DLE1BQU0sR0FBRyx1QkFBU0wsUUFBVCxFQUFtQk0sbUJBQW5CLEVBQWdDUixRQUFoQyxFQUEwQ0MsUUFBMUMsQ0FBZjtBQUNBLFNBQU9NLE1BQVA7QUFDRCxDQVRNOzs7O0FBV0EsTUFBTUUsZ0JBQWdCLEdBQUlDLEtBQUQsSUFBVztBQUN6QyxRQUFNQyxnQkFBZ0IsR0FBR0QsS0FBekIsQ0FEeUMsQ0FDVDs7QUFDaEMsUUFBTUUsR0FBRyxHQUFHQyxZQUFHQyxZQUFILENBQWdCSCxnQkFBaEIsRUFBa0MsT0FBbEMsQ0FBWjs7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR2hCLFFBQVEsQ0FBQ2EsR0FBRCxFQUFNRCxnQkFBTixDQUFqQztBQUNBLFNBQU9JLGdCQUFQO0FBQ0QsQ0FMTTs7OztBQU9QLElBQUksT0FBT0MsT0FBUCxLQUFtQixXQUFuQixJQUFrQ0EsT0FBTyxDQUFDQyxJQUFSLEtBQWlCQyxNQUF2RCxFQUErRDtBQUM3RDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnLi90cmF2ZXJzZSc7XG5pbXBvcnQgT3BlbkFQSVJvb3QgZnJvbSAnLi92YWxpZGF0b3JzJztcbmltcG9ydCBjbGkgZnJvbSAnLi9jbGknO1xuXG5leHBvcnQgY29uc3QgdmFsaWRhdGUgPSAoeWFtbERhdGEsIGZpbGVQYXRoKSA9PiB7XG4gIGxldCBkb2N1bWVudDtcbiAgdHJ5IHtcbiAgICBkb2N1bWVudCA9IHlhbWwuc2FmZUxvYWQoeWFtbERhdGEpO1xuICB9IGNhdGNoIChleCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGxvYWQgeWFtbCBmaWxlXCIpO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IHRyYXZlcnNlKGRvY3VtZW50LCBPcGVuQVBJUm9vdCwgeWFtbERhdGEsIGZpbGVQYXRoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUZyb21GaWxlID0gKGZOYW1lKSA9PiB7XG4gIGNvbnN0IHJlc29sdmVkRmlsZU5hbWUgPSBmTmFtZTsgLy8gcGF0aC5yZXNvbHZlKGZOYW1lKTtcbiAgY29uc3QgZG9jID0gZnMucmVhZEZpbGVTeW5jKHJlc29sdmVkRmlsZU5hbWUsICd1dGYtOCcpO1xuICBjb25zdCB2YWxpZGF0aW9uUmVzdWx0ID0gdmFsaWRhdGUoZG9jLCByZXNvbHZlZEZpbGVOYW1lKTtcbiAgcmV0dXJuIHZhbGlkYXRpb25SZXN1bHQ7XG59O1xuXG5pZiAodHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnICYmIHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNsaSgpO1xufVxuIl19