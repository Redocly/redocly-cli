"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _commander = _interopRequireDefault(require("commander"));

var _validate = require("./validate");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cli() {
  _commander.default.command('validate <path>', {
    isDefault: true
  }).action(path => {
    const result = (0, _validate.validateFromFile)(path);
    result.forEach(entry => process.stdout.write(entry.prettyPrint()));
  });

  if (process.argv.length === 2) process.argv.push('validate');

  _commander.default.parse(process.argv);
}

var _default = cli;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiY2xpIiwicHJvZ3JhbSIsImNvbW1hbmQiLCJpc0RlZmF1bHQiLCJhY3Rpb24iLCJwYXRoIiwicmVzdWx0IiwiZm9yRWFjaCIsImVudHJ5IiwicHJvY2VzcyIsInN0ZG91dCIsIndyaXRlIiwicHJldHR5UHJpbnQiLCJhcmd2IiwibGVuZ3RoIiwicHVzaCIsInBhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFFQSxTQUFTQSxHQUFULEdBQWU7QUFDYkMscUJBQ0dDLE9BREgsQ0FDVyxpQkFEWCxFQUM4QjtBQUFFQyxJQUFBQSxTQUFTLEVBQUU7QUFBYixHQUQ5QixFQUVHQyxNQUZILENBRVdDLElBQUQsSUFBVTtBQUNoQixVQUFNQyxNQUFNLEdBQUcsZ0NBQWlCRCxJQUFqQixDQUFmO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFnQkMsS0FBRCxJQUFXQyxPQUFPLENBQUNDLE1BQVIsQ0FBZUMsS0FBZixDQUFxQkgsS0FBSyxDQUFDSSxXQUFOLEVBQXJCLENBQTFCO0FBQ0QsR0FMSDs7QUFPQSxNQUFJSCxPQUFPLENBQUNJLElBQVIsQ0FBYUMsTUFBYixLQUF3QixDQUE1QixFQUErQkwsT0FBTyxDQUFDSSxJQUFSLENBQWFFLElBQWIsQ0FBa0IsVUFBbEI7O0FBRS9CZCxxQkFBUWUsS0FBUixDQUFjUCxPQUFPLENBQUNJLElBQXRCO0FBQ0Q7O2VBRWNiLEciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJvZ3JhbSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHsgdmFsaWRhdGVGcm9tRmlsZSB9IGZyb20gJy4vdmFsaWRhdGUnO1xuXG5mdW5jdGlvbiBjbGkoKSB7XG4gIHByb2dyYW1cbiAgICAuY29tbWFuZCgndmFsaWRhdGUgPHBhdGg+JywgeyBpc0RlZmF1bHQ6IHRydWUgfSlcbiAgICAuYWN0aW9uKChwYXRoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUZyb21GaWxlKHBhdGgpO1xuICAgICAgcmVzdWx0LmZvckVhY2goKGVudHJ5KSA9PiBwcm9jZXNzLnN0ZG91dC53cml0ZShlbnRyeS5wcmV0dHlQcmludCgpKSk7XG4gICAgfSk7XG5cbiAgaWYgKHByb2Nlc3MuYXJndi5sZW5ndGggPT09IDIpIHByb2Nlc3MuYXJndi5wdXNoKCd2YWxpZGF0ZScpO1xuXG4gIHByb2dyYW0ucGFyc2UocHJvY2Vzcy5hcmd2KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xpO1xuIl19