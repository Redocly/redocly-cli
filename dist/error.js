"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _yaml = require("./yaml");

const prettyPrintError = error => {
  const message = `${error.location.startLine}:${error.location.startCol}` + ' Following error occured:\n' + `${error.message} by path ${error.path}\n` + `${error.pathStack.length ? `path stack is ${error.pathStack}` : ''}\n` + `${error.codeFrame}`;
  return message;
};

const createError = (msg, node, ctx, target) => {
  const location = (0, _yaml.getLocationByPath)(Array.from(ctx.path), ctx, target);
  const body = {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map(el => el.join('/')),
    location,
    codeFrame: (0, _yaml.getCodeFrameForLocation)(location.startIndex, location.endIndex, ctx.source),
    value: node,
    severity: 'ERROR'
  };
  return { ...body,
    prettyPrint: () => prettyPrintError(body)
  };
};

var _default = createError;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9lcnJvci5qcyJdLCJuYW1lcyI6WyJwcmV0dHlQcmludEVycm9yIiwiZXJyb3IiLCJtZXNzYWdlIiwibG9jYXRpb24iLCJzdGFydExpbmUiLCJzdGFydENvbCIsInBhdGgiLCJwYXRoU3RhY2siLCJsZW5ndGgiLCJjb2RlRnJhbWUiLCJjcmVhdGVFcnJvciIsIm1zZyIsIm5vZGUiLCJjdHgiLCJ0YXJnZXQiLCJBcnJheSIsImZyb20iLCJib2R5Iiwiam9pbiIsIm1hcCIsImVsIiwic3RhcnRJbmRleCIsImVuZEluZGV4Iiwic291cmNlIiwidmFsdWUiLCJzZXZlcml0eSIsInByZXR0eVByaW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUEsTUFBTUEsZ0JBQWdCLEdBQUlDLEtBQUQsSUFBVztBQUNsQyxRQUFNQyxPQUFPLEdBQUksR0FBRUQsS0FBSyxDQUFDRSxRQUFOLENBQWVDLFNBQVUsSUFBR0gsS0FBSyxDQUFDRSxRQUFOLENBQWVFLFFBQVMsRUFBdkQsR0FDZCw2QkFEYyxHQUViLEdBQUVKLEtBQUssQ0FBQ0MsT0FBUSxZQUFXRCxLQUFLLENBQUNLLElBQUssSUFGekIsR0FHYixHQUFFTCxLQUFLLENBQUNNLFNBQU4sQ0FBZ0JDLE1BQWhCLEdBQTBCLGlCQUFnQlAsS0FBSyxDQUFDTSxTQUFVLEVBQTFELEdBQThELEVBQUcsSUFIdEQsR0FJYixHQUFFTixLQUFLLENBQUNRLFNBQVUsRUFKckI7QUFLQSxTQUFPUCxPQUFQO0FBQ0QsQ0FQRDs7QUFTQSxNQUFNUSxXQUFXLEdBQUcsQ0FBQ0MsR0FBRCxFQUFNQyxJQUFOLEVBQVlDLEdBQVosRUFBaUJDLE1BQWpCLEtBQTRCO0FBQzlDLFFBQU1YLFFBQVEsR0FBRyw2QkFBa0JZLEtBQUssQ0FBQ0MsSUFBTixDQUFXSCxHQUFHLENBQUNQLElBQWYsQ0FBbEIsRUFBd0NPLEdBQXhDLEVBQTZDQyxNQUE3QyxDQUFqQjtBQUNBLFFBQU1HLElBQUksR0FBRztBQUNYZixJQUFBQSxPQUFPLEVBQUVTLEdBREU7QUFFWEwsSUFBQUEsSUFBSSxFQUFFTyxHQUFHLENBQUNQLElBQUosQ0FBU1ksSUFBVCxDQUFjLEdBQWQsQ0FGSztBQUdYWCxJQUFBQSxTQUFTLEVBQUVNLEdBQUcsQ0FBQ04sU0FBSixDQUFjWSxHQUFkLENBQW1CQyxFQUFELElBQVFBLEVBQUUsQ0FBQ0YsSUFBSCxDQUFRLEdBQVIsQ0FBMUIsQ0FIQTtBQUlYZixJQUFBQSxRQUpXO0FBS1hNLElBQUFBLFNBQVMsRUFBRSxtQ0FBd0JOLFFBQVEsQ0FBQ2tCLFVBQWpDLEVBQTZDbEIsUUFBUSxDQUFDbUIsUUFBdEQsRUFBZ0VULEdBQUcsQ0FBQ1UsTUFBcEUsQ0FMQTtBQU1YQyxJQUFBQSxLQUFLLEVBQUVaLElBTkk7QUFPWGEsSUFBQUEsUUFBUSxFQUFFO0FBUEMsR0FBYjtBQVNBLFNBQU8sRUFDTCxHQUFHUixJQURFO0FBRUxTLElBQUFBLFdBQVcsRUFBRSxNQUFNMUIsZ0JBQWdCLENBQUNpQixJQUFEO0FBRjlCLEdBQVA7QUFJRCxDQWZEOztlQWlCZVAsVyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldExvY2F0aW9uQnlQYXRoLCBnZXRDb2RlRnJhbWVGb3JMb2NhdGlvbiB9IGZyb20gJy4veWFtbCc7XG5cbmNvbnN0IHByZXR0eVByaW50RXJyb3IgPSAoZXJyb3IpID0+IHtcbiAgY29uc3QgbWVzc2FnZSA9IGAke2Vycm9yLmxvY2F0aW9uLnN0YXJ0TGluZX06JHtlcnJvci5sb2NhdGlvbi5zdGFydENvbH1gXG4gICsgJyBGb2xsb3dpbmcgZXJyb3Igb2NjdXJlZDpcXG4nXG4gICsgYCR7ZXJyb3IubWVzc2FnZX0gYnkgcGF0aCAke2Vycm9yLnBhdGh9XFxuYFxuICArIGAke2Vycm9yLnBhdGhTdGFjay5sZW5ndGggPyBgcGF0aCBzdGFjayBpcyAke2Vycm9yLnBhdGhTdGFja31gIDogJyd9XFxuYFxuICArIGAke2Vycm9yLmNvZGVGcmFtZX1gO1xuICByZXR1cm4gbWVzc2FnZTtcbn07XG5cbmNvbnN0IGNyZWF0ZUVycm9yID0gKG1zZywgbm9kZSwgY3R4LCB0YXJnZXQpID0+IHtcbiAgY29uc3QgbG9jYXRpb24gPSBnZXRMb2NhdGlvbkJ5UGF0aChBcnJheS5mcm9tKGN0eC5wYXRoKSwgY3R4LCB0YXJnZXQpO1xuICBjb25zdCBib2R5ID0ge1xuICAgIG1lc3NhZ2U6IG1zZyxcbiAgICBwYXRoOiBjdHgucGF0aC5qb2luKCcvJyksXG4gICAgcGF0aFN0YWNrOiBjdHgucGF0aFN0YWNrLm1hcCgoZWwpID0+IGVsLmpvaW4oJy8nKSksXG4gICAgbG9jYXRpb24sXG4gICAgY29kZUZyYW1lOiBnZXRDb2RlRnJhbWVGb3JMb2NhdGlvbihsb2NhdGlvbi5zdGFydEluZGV4LCBsb2NhdGlvbi5lbmRJbmRleCwgY3R4LnNvdXJjZSksXG4gICAgdmFsdWU6IG5vZGUsXG4gICAgc2V2ZXJpdHk6ICdFUlJPUicsXG4gIH07XG4gIHJldHVybiB7XG4gICAgLi4uYm9keSxcbiAgICBwcmV0dHlQcmludDogKCkgPT4gcHJldHR5UHJpbnRFcnJvcihib2R5KSxcbiAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUVycm9yO1xuIl19