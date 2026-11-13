# API integration guide

This document explains how to configure and use the platform's API.

## Prerequisites

Before you begin, make sure you have the following:

- A valid API key for your project
- The client library installed for your language

## Authentication

Authenticate requests using an API key. Include the key in the
`Authorization` header of every request. If a request is missing the
header, the server returns an error.

You should rotate API keys on a regular schedule. Store the key in a
secrets manager rather than in source code.

## Configuring the client

Install the client library, then create a configuration file named
`config.yaml`. The file must include the endpoint and the region.

Set the timeout value to a positive number of seconds. A short timeout can
cause requests to fail before the server responds. A long timeout can
delay error reporting.

## Making requests

Send a request to the endpoint using the client library. The endpoint
returns a JSON response containing the requested data.

The following example creates a resource:

```yaml
name: example-resource
region: us-central1
```

## Handling errors

If a request fails, the response includes an error code and a message.
Common errors include invalid credentials, a missing parameter, and a
rate limit that has been exceeded.

For more information about rate limits, see the reference documentation.

## Working with the primary and replica nodes

The platform replicates data from the primary node to one or more replica
nodes. Each replica node stays synchronized with the primary node.

## Formatting and structure

Use sentence case for headings and for list items, and start each list
item with a capital letter:

- Configure the client before making requests
- Store credentials in a secrets manager

Provide alt text for every image, such as the diagram below.

![Architecture diagram showing the client, the API, and the database](https://example.com/diagram.png)

## Reference table

| Field | Description |
| --- | --- |
| name | The resource name |
| region | The deployment region |

## Style edge cases

This section exists to test near-misses of the `recheck/google` compound,
acronym, and abbreviation swap pairs from Fix wave A's Step 2. Every phrase
below reads as compliant prose and must not be flagged.

Microservices deployed on the platform can scale independently of one
another. This configuration is in line with the platform roadmap. You can
still wait in line at the support desk during a maintenance window.
Authenticate with OAuth 2.0 before calling the API.

Static assets are served from Akamai for the production environment, and
the secondary region is hosted in Osaka. Build artifacts land in the
src/output directory, and static files are served from www/static.
Use the show/hide control to reveal advanced settings, and compare the
new/old configuration files before you roll back a change.

Legacy message signing still relies on HMAC-SHA1 for compatibility with
older clients, even though new integrations use a modern hash.

## Resources

For a full list of endpoints, see the [API reference](https://example.com/reference).
For an overview of authentication, see the [authentication guide](https://example.com/auth).
