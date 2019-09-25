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

const validate = (yamlData, filePath) => {
  let document;

  try {
    document = _jsYaml.default.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) return [];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy92YWxpZGF0ZS5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZSIsInlhbWxEYXRhIiwiZmlsZVBhdGgiLCJkb2N1bWVudCIsInlhbWwiLCJzYWZlTG9hZCIsImV4IiwiRXJyb3IiLCJvcGVuYXBpIiwicmVzdWx0IiwiT3BlbkFQSVJvb3QiLCJ2YWxpZGF0ZUZyb21GaWxlIiwiZk5hbWUiLCJyZXNvbHZlZEZpbGVOYW1lIiwiZG9jIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ2YWxpZGF0aW9uUmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7QUFFTyxNQUFNQSxRQUFRLEdBQUcsQ0FBQ0MsUUFBRCxFQUFXQyxRQUFYLEtBQXdCO0FBQzlDLE1BQUlDLFFBQUo7O0FBQ0EsTUFBSTtBQUNGQSxJQUFBQSxRQUFRLEdBQUdDLGdCQUFLQyxRQUFMLENBQWNKLFFBQWQsQ0FBWDtBQUNELEdBRkQsQ0FFRSxPQUFPSyxFQUFQLEVBQVc7QUFDWCxVQUFNLElBQUlDLEtBQUosQ0FBVSxzQkFBVixDQUFOO0FBQ0Q7O0FBQ0QsTUFBSSxDQUFDSixRQUFRLENBQUNLLE9BQWQsRUFBdUIsT0FBTyxFQUFQO0FBQ3ZCLFFBQU1DLE1BQU0sR0FBRyx1QkFBU04sUUFBVCxFQUFtQk8sbUJBQW5CLEVBQWdDVCxRQUFoQyxFQUEwQ0MsUUFBMUMsQ0FBZjtBQUNBLFNBQU9PLE1BQVA7QUFDRCxDQVZNOzs7O0FBWUEsTUFBTUUsZ0JBQWdCLEdBQUlDLEtBQUQsSUFBVztBQUN6QyxRQUFNQyxnQkFBZ0IsR0FBR0QsS0FBekIsQ0FEeUMsQ0FDVDs7QUFDaEMsUUFBTUUsR0FBRyxHQUFHQyxZQUFHQyxZQUFILENBQWdCSCxnQkFBaEIsRUFBa0MsT0FBbEMsQ0FBWjs7QUFDQSxRQUFNSSxnQkFBZ0IsR0FBR2pCLFFBQVEsQ0FBQ2MsR0FBRCxFQUFNRCxnQkFBTixDQUFqQztBQUNBLFNBQU9JLGdCQUFQO0FBQ0QsQ0FMTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuaW1wb3J0IHRyYXZlcnNlIGZyb20gJy4vdHJhdmVyc2UnO1xuaW1wb3J0IE9wZW5BUElSb290IGZyb20gJy4vdmFsaWRhdG9ycyc7XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZSA9ICh5YW1sRGF0YSwgZmlsZVBhdGgpID0+IHtcbiAgbGV0IGRvY3VtZW50O1xuICB0cnkge1xuICAgIGRvY3VtZW50ID0geWFtbC5zYWZlTG9hZCh5YW1sRGF0YSk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgbG9hZCB5YW1sIGZpbGVcIik7XG4gIH1cbiAgaWYgKCFkb2N1bWVudC5vcGVuYXBpKSByZXR1cm4gW107XG4gIGNvbnN0IHJlc3VsdCA9IHRyYXZlcnNlKGRvY3VtZW50LCBPcGVuQVBJUm9vdCwgeWFtbERhdGEsIGZpbGVQYXRoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUZyb21GaWxlID0gKGZOYW1lKSA9PiB7XG4gIGNvbnN0IHJlc29sdmVkRmlsZU5hbWUgPSBmTmFtZTsgLy8gcGF0aC5yZXNvbHZlKGZOYW1lKTtcbiAgY29uc3QgZG9jID0gZnMucmVhZEZpbGVTeW5jKHJlc29sdmVkRmlsZU5hbWUsICd1dGYtOCcpO1xuICBjb25zdCB2YWxpZGF0aW9uUmVzdWx0ID0gdmFsaWRhdGUoZG9jLCByZXNvbHZlZEZpbGVOYW1lKTtcbiAgcmV0dXJuIHZhbGlkYXRpb25SZXN1bHQ7XG59O1xuIl19