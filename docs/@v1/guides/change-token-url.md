# Change OAuth2 token URL

Use a custom decorator to change the OAuth2 credentials flow token URL.

Estimated time: 15 minutes

## Step-by-step instructions

1. Add this code to your repo with the API (the Redocly configuration file is an example).
   {% tabs %}
   {% tab label="redocly.yaml" %}

   ```yaml
   extends:
     - recommended
   plugins:
     - './acme-plugin.js'
   decorators:
     plugin/change-token-url:
       tokenUrl: 'https://token.example.com/url'
   ```

   {% /tab  %}
   {% tab label="acme-plugin.js" %}

   ```js
   const ChangeTokenUrl = require('./decorators/change-token-url');
   const id = 'plugin';

   /** @type {import('@redocly/cli').CustomRulesConfig} */
   const decorators = {
     oas3: {
       'change-token-url': ChangeTokenUrl,
     },
   };

   module.exports = function changeTokenPlugin() {
     return {
       id,
       decorators,
     };
   };
   ```

   {% /tab  %}
   {% tab label="decorators/change-token-url.js" %}

   ```js
   module.exports = ChangeTokenUrl;

   /** @type {import('@redocly/cli').OasDecorator} */
   function ChangeTokenUrl({ tokenUrl }) {
     return {
       OAuth2Flows: {
         leave(flows, ctx) {
           if (tokenUrl) {
             flows.clientCredentials.tokenUrl = tokenUrl;
           }
         },
       },
     };
   }
   ```

   {% /tab  %}
   {% /tabs  %}
