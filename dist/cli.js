"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _commander = _interopRequireDefault(require("commander"));

var _validate = require("./validate");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cli() {
  _commander.default.arguments('<path>').option('-s, --no-frame', 'Print no codeframes with errors.', false).action(path => {
    process.stdout.write(`Will validate the ${path}\n`);
    const result = (0, _validate.validateFromFile)(path, {
      enableCodeframe: _commander.default.frame
    });
    process.stdout.write('Following results received:\n');

    if (result.length > 0) {
      process.stdout.write('\n\n');
      result.forEach(entry => process.stdout.write(entry.prettyPrint()));
    } else {
      process.stdout.write('No errors found. Congrats!');
    }
  });

  if (process.argv.length === 2) process.argv.push('-h');

  _commander.default.parse(process.argv);
}

var _default = cli;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiY2xpIiwicHJvZ3JhbSIsImFyZ3VtZW50cyIsIm9wdGlvbiIsImFjdGlvbiIsInBhdGgiLCJwcm9jZXNzIiwic3Rkb3V0Iiwid3JpdGUiLCJyZXN1bHQiLCJlbmFibGVDb2RlZnJhbWUiLCJmcmFtZSIsImxlbmd0aCIsImZvckVhY2giLCJlbnRyeSIsInByZXR0eVByaW50IiwiYXJndiIsInB1c2giLCJwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOzs7O0FBRUEsU0FBU0EsR0FBVCxHQUFlO0FBQ2JDLHFCQUNHQyxTQURILENBQ2EsUUFEYixFQUVHQyxNQUZILENBRVUsZ0JBRlYsRUFFNEIsa0NBRjVCLEVBRWdFLEtBRmhFLEVBR0dDLE1BSEgsQ0FHV0MsSUFBRCxJQUFVO0FBQ2hCQyxJQUFBQSxPQUFPLENBQUNDLE1BQVIsQ0FBZUMsS0FBZixDQUFzQixxQkFBb0JILElBQUssSUFBL0M7QUFDQSxVQUFNSSxNQUFNLEdBQUcsZ0NBQWlCSixJQUFqQixFQUF1QjtBQUFFSyxNQUFBQSxlQUFlLEVBQUVULG1CQUFRVTtBQUEzQixLQUF2QixDQUFmO0FBQ0FMLElBQUFBLE9BQU8sQ0FBQ0MsTUFBUixDQUFlQyxLQUFmLENBQXFCLCtCQUFyQjs7QUFDQSxRQUFJQyxNQUFNLENBQUNHLE1BQVAsR0FBZ0IsQ0FBcEIsRUFBdUI7QUFDckJOLE1BQUFBLE9BQU8sQ0FBQ0MsTUFBUixDQUFlQyxLQUFmLENBQXFCLE1BQXJCO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0ksT0FBUCxDQUFnQkMsS0FBRCxJQUFXUixPQUFPLENBQUNDLE1BQVIsQ0FBZUMsS0FBZixDQUFxQk0sS0FBSyxDQUFDQyxXQUFOLEVBQXJCLENBQTFCO0FBQ0QsS0FIRCxNQUdPO0FBQ0xULE1BQUFBLE9BQU8sQ0FBQ0MsTUFBUixDQUFlQyxLQUFmLENBQXFCLDRCQUFyQjtBQUNEO0FBQ0YsR0FiSDs7QUFlQSxNQUFJRixPQUFPLENBQUNVLElBQVIsQ0FBYUosTUFBYixLQUF3QixDQUE1QixFQUErQk4sT0FBTyxDQUFDVSxJQUFSLENBQWFDLElBQWIsQ0FBa0IsSUFBbEI7O0FBRS9CaEIscUJBQVFpQixLQUFSLENBQWNaLE9BQU8sQ0FBQ1UsSUFBdEI7QUFDRDs7ZUFFY2hCLEciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJvZ3JhbSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHsgdmFsaWRhdGVGcm9tRmlsZSB9IGZyb20gJy4vdmFsaWRhdGUnO1xuXG5mdW5jdGlvbiBjbGkoKSB7XG4gIHByb2dyYW1cbiAgICAuYXJndW1lbnRzKCc8cGF0aD4nKVxuICAgIC5vcHRpb24oJy1zLCAtLW5vLWZyYW1lJywgJ1ByaW50IG5vIGNvZGVmcmFtZXMgd2l0aCBlcnJvcnMuJywgZmFsc2UpXG4gICAgLmFjdGlvbigocGF0aCkgPT4ge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYFdpbGwgdmFsaWRhdGUgdGhlICR7cGF0aH1cXG5gKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRnJvbUZpbGUocGF0aCwgeyBlbmFibGVDb2RlZnJhbWU6IHByb2dyYW0uZnJhbWUgfSk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnRm9sbG93aW5nIHJlc3VsdHMgcmVjZWl2ZWQ6XFxuJyk7XG4gICAgICBpZiAocmVzdWx0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoJ1xcblxcbicpO1xuICAgICAgICByZXN1bHQuZm9yRWFjaCgoZW50cnkpID0+IHByb2Nlc3Muc3Rkb3V0LndyaXRlKGVudHJ5LnByZXR0eVByaW50KCkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKCdObyBlcnJvcnMgZm91bmQuIENvbmdyYXRzIScpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIGlmIChwcm9jZXNzLmFyZ3YubGVuZ3RoID09PSAyKSBwcm9jZXNzLmFyZ3YucHVzaCgnLWgnKTtcblxuICBwcm9ncmFtLnBhcnNlKHByb2Nlc3MuYXJndik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsaTtcbiJdfQ==