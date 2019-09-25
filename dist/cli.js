"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _commander = _interopRequireDefault(require("commander"));

var _fs = _interopRequireDefault(require("fs"));

var _validate = require("./validate");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cli() {
  // program.version(JSON.parse(fs.readFileSync('package.json')).version);
  _commander.default.command('validate <path>', {
    isDefault: true
  }).action(path => {
    console.log('Will validate');
    const result = (0, _validate.validateFromFile)(path);
    result.forEach(entry => console.log(entry.prettyPrint()));
  });

  if (process.argv.length === 2) process.argv.push('validate');

  _commander.default.parse(process.argv);
}

var _default = cli;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiY2xpIiwicHJvZ3JhbSIsImNvbW1hbmQiLCJpc0RlZmF1bHQiLCJhY3Rpb24iLCJwYXRoIiwiY29uc29sZSIsImxvZyIsInJlc3VsdCIsImZvckVhY2giLCJlbnRyeSIsInByZXR0eVByaW50IiwicHJvY2VzcyIsImFyZ3YiLCJsZW5ndGgiLCJwdXNoIiwicGFyc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQUVBLFNBQVNBLEdBQVQsR0FBZTtBQUNiO0FBQ0FDLHFCQUNHQyxPQURILENBQ1csaUJBRFgsRUFDOEI7QUFBRUMsSUFBQUEsU0FBUyxFQUFFO0FBQWIsR0FEOUIsRUFFR0MsTUFGSCxDQUVXQyxJQUFELElBQVU7QUFDaEJDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGVBQVo7QUFDQSxVQUFNQyxNQUFNLEdBQUcsZ0NBQWlCSCxJQUFqQixDQUFmO0FBQ0FHLElBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFnQkMsS0FBRCxJQUFXSixPQUFPLENBQUNDLEdBQVIsQ0FBWUcsS0FBSyxDQUFDQyxXQUFOLEVBQVosQ0FBMUI7QUFDRCxHQU5IOztBQVFBLE1BQUlDLE9BQU8sQ0FBQ0MsSUFBUixDQUFhQyxNQUFiLEtBQXdCLENBQTVCLEVBQStCRixPQUFPLENBQUNDLElBQVIsQ0FBYUUsSUFBYixDQUFrQixVQUFsQjs7QUFFL0JkLHFCQUFRZSxLQUFSLENBQWNKLE9BQU8sQ0FBQ0MsSUFBdEI7QUFDRDs7ZUFFY2IsRyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwcm9ncmFtIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgdmFsaWRhdGVGcm9tRmlsZSB9IGZyb20gJy4vdmFsaWRhdGUnO1xuXG5mdW5jdGlvbiBjbGkoKSB7XG4gIC8vIHByb2dyYW0udmVyc2lvbihKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJykpLnZlcnNpb24pO1xuICBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3ZhbGlkYXRlIDxwYXRoPicsIHsgaXNEZWZhdWx0OiB0cnVlIH0pXG4gICAgLmFjdGlvbigocGF0aCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1dpbGwgdmFsaWRhdGUnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRnJvbUZpbGUocGF0aCk7XG4gICAgICByZXN1bHQuZm9yRWFjaCgoZW50cnkpID0+IGNvbnNvbGUubG9nKGVudHJ5LnByZXR0eVByaW50KCkpKTtcbiAgICB9KTtcblxuICBpZiAocHJvY2Vzcy5hcmd2Lmxlbmd0aCA9PT0gMikgcHJvY2Vzcy5hcmd2LnB1c2goJ3ZhbGlkYXRlJyk7XG5cbiAgcHJvZ3JhbS5wYXJzZShwcm9jZXNzLmFyZ3YpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGk7XG4iXX0=