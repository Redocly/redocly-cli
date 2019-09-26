"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getConfig(options) {
  let config = {};
  let {
    configPath
  } = options;
  if (!configPath) configPath = `${process.cwd()}/revalid.config.json`;

  if (_fs.default.existsSync(configPath)) {
    const configRaw = _fs.default.readFileSync(configPath, 'utf-8');

    config = JSON.parse(configRaw);
  }

  return {
    enableCodeframe: true,
    enbaleCustomRuleset: true,
    ...config,
    ...options
  };
}

var _default = getConfig;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWcuanMiXSwibmFtZXMiOlsiZ2V0Q29uZmlnIiwib3B0aW9ucyIsImNvbmZpZyIsImNvbmZpZ1BhdGgiLCJwcm9jZXNzIiwiY3dkIiwiZnMiLCJleGlzdHNTeW5jIiwiY29uZmlnUmF3IiwicmVhZEZpbGVTeW5jIiwiSlNPTiIsInBhcnNlIiwiZW5hYmxlQ29kZWZyYW1lIiwiZW5iYWxlQ3VzdG9tUnVsZXNldCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7O0FBRUEsU0FBU0EsU0FBVCxDQUFtQkMsT0FBbkIsRUFBNEI7QUFDMUIsTUFBSUMsTUFBTSxHQUFHLEVBQWI7QUFDQSxNQUFJO0FBQUVDLElBQUFBO0FBQUYsTUFBaUJGLE9BQXJCO0FBQ0EsTUFBSSxDQUFDRSxVQUFMLEVBQWlCQSxVQUFVLEdBQUksR0FBRUMsT0FBTyxDQUFDQyxHQUFSLEVBQWMsc0JBQTlCOztBQUdqQixNQUFJQyxZQUFHQyxVQUFILENBQWNKLFVBQWQsQ0FBSixFQUErQjtBQUM3QixVQUFNSyxTQUFTLEdBQUdGLFlBQUdHLFlBQUgsQ0FBZ0JOLFVBQWhCLEVBQTRCLE9BQTVCLENBQWxCOztBQUNBRCxJQUFBQSxNQUFNLEdBQUdRLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxTQUFYLENBQVQ7QUFDRDs7QUFFRCxTQUFPO0FBQ0xJLElBQUFBLGVBQWUsRUFBRSxJQURaO0FBRUxDLElBQUFBLG1CQUFtQixFQUFFLElBRmhCO0FBR0wsT0FBR1gsTUFIRTtBQUlMLE9BQUdEO0FBSkUsR0FBUDtBQU1EOztlQUVjRCxTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZnVuY3Rpb24gZ2V0Q29uZmlnKG9wdGlvbnMpIHtcbiAgbGV0IGNvbmZpZyA9IHt9O1xuICBsZXQgeyBjb25maWdQYXRoIH0gPSBvcHRpb25zO1xuICBpZiAoIWNvbmZpZ1BhdGgpIGNvbmZpZ1BhdGggPSBgJHtwcm9jZXNzLmN3ZCgpfS9yZXZhbGlkLmNvbmZpZy5qc29uYDtcblxuXG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XG4gICAgY29uc3QgY29uZmlnUmF3ID0gZnMucmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsICd1dGYtOCcpO1xuICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnUmF3KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZW5hYmxlQ29kZWZyYW1lOiB0cnVlLFxuICAgIGVuYmFsZUN1c3RvbVJ1bGVzZXQ6IHRydWUsXG4gICAgLi4uY29uZmlnLFxuICAgIC4uLm9wdGlvbnMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldENvbmZpZztcbiJdfQ==