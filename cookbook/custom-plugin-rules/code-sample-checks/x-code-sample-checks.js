import CheckSDKCoverage from './check-sdk-coverage.js';

export default function myRulesPlugin() {
  return {
    id: 'x-code-samples-check',
    rules: {
      oas3: {
        'check-sdk-coverage': CheckSDKCoverage,
      },
    },
  };
}
