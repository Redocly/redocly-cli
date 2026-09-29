# API integration guide

This guide explains how to configure and use the platform's API. It's
written for developers who are already familiar with REST APIs. You'll
find setup steps, authentication guidance, and troubleshooting tips
throughout the guide.

## Prerequisites

Before you begin, make sure you have a valid API key for your project and
the client library installed for your language. You'll also need network
access to the API endpoint and a text editor for configuration files.

- Install the client library for your language
- Create a configuration file named `config.yaml`
- Store your API key in a secrets manager

## Authentication

Authenticate requests using an API key. Include the key in the
`Authorization` request header of every call. If a header is missing, the
server returns an error and the request doesn't complete.

You should rotate API keys on a regular schedule. Don't store credentials
in source code, and don't share a key across multiple projects. A managed
disk snapshot of the secrets store is a common backup pattern for teams
that manage their own key storage.

## Working directory and configuration

Run the setup command from the project's working directory so the client
finds `config.yaml` automatically. The file must include the endpoint and
the region, and it can optionally include a timeout value.

Set the timeout to a positive number of seconds. A short timeout can cause
requests to fail before the server responds, and a long timeout can delay
error reporting. Choose a value that fits your network conditions.

## Making requests

Send a request to the endpoint using the client library. The endpoint
returns a JSON response containing the requested data. You can select
different response formats depending on the `Accept` header you send.

The following example creates a resource:

```yaml
name: example-resource
region: us-central1
```

## Handling errors

If a request fails, the response includes an error code and a message.
Common errors include invalid credentials and a missing parameter. Right-click
the response in your browser's developer tools to copy it for a bug report.

For more about rate limits, see the reference documentation for this
endpoint.

## Primary and replica nodes

The platform replicates data from the primary node to one or more replica
nodes. Each replica node stays synchronized with the primary node, and a
failover promotes a replica to primary if the original node stops
responding.

## Maintenance schedule

Scheduled maintenance runs during a fixed window each week. A typical
window runs from 2:15 PM – 4:45 PM in the account's configured time
zone, and the service remains available throughout. Notifications are
sent to subscribed contacts before the window begins.

## Formatting and structure

Use sentence case for headings and for list items, and start each list
item with a capital letter:

- Configure the client before making requests
- Store credentials in a secrets manager

Provide alt text for every image, such as the diagram below.

![Diagram of the client, the API, and the database.](https://example.com/diagram.png)

## Reference table

| Field | Description |
| --- | --- |
| name | The resource name |
| region | The deployment region |
| status | None |

## API terminology

This section uses developer-facing terms the way Microsoft's own guide
allows for content written for developers. A response header carries
metadata about the request. A directory on disk stores build output, and a
context menu in the sample app exposes advanced options. This paragraph
exists to confirm the preset doesn't misfire on any of those four terms.

## About single sign-on

Single sign-on (SSO) lets a user authenticate once and reach multiple
connected applications. Configure single sign-on before you enable
multifactor authentication for your organization, since a few identity
providers require it during setup. Microsoft's own documentation for this
feature follows the same abbreviation pattern.

## Following the style guide

This preset follows Microsoft's own style guide, and Microsoft's writing
recommendations shaped every rule in this file. Microsoft's guide is the
authoritative source for the terminology used across this document.

## Style edge cases

This section exists to test near-misses of the compound, spelling, and
UI-verb rules this preset ships. Every phrase below reads as compliant
prose and must not be flagged.

Double-click the icon to open it, or right-click it for more options. The
analytics dashboard reports clickstream and clickthrough data for the past
week. A tooltip appears when you hover over the icon, and the email
notification arrives within a minute. Static assets are cached at the edge,
and the workstation image includes the client library preinstalled.

Send the confirmation email once setup completes, and check the database
for the new record. The endpoint accepts a JSON payload, and the website
renders the response for review. This build runs on a shared workstation
in the lab, and the screenshot in the report shows the finished dashboard.
A plugin extends the client with retry logic, and the namespace keeps
generated types isolated from your own code.

## Accessibility term near-misses

This section exists to test near-misses of the accessibility term
collection added in the task-10 fix wave. Every phrase below reads as
compliant, technical, or medical prose and must not be flagged.

Select the mute icon to mute the microphone before joining the call.

The response times for this endpoint follow a normal distribution across
the sampled requests.

The monitoring device can detect an epileptic seizure and alert a
caregiver automatically.

## Avoid-term near-misses

This section exists to test near-misses of the A-Z Tier-1 word-list rules
added in the task-10 fix wave B. Every phrase below reads as compliant
technical prose and must not be flagged. Each one uses a Tier-1 avoid-term
in a noun position or compound, or in an unrelated homograph sense that
the guide's own verb-scoped or context-scoped entry never targets.

The exit code is 1 when the command fails, and the log includes a stack
trace. Attach the crash dump before filing a support ticket with the
platform team. Roman numerals aren't supported in this field; use Arabic
numerals instead.

The product launch is scheduled for next quarter, pending final sign-off
from the regional teams. Set the boot disk size before creating the
virtual machine, since it can't be resized later. Mount the SMB share to
access the network files from the build agent.

A blade server occupies one slot in the chassis, and the enclosure holds
up to sixteen of them. The beta distribution models the prior probability
in the reliability calculation. Visit counts are aggregated per day for
each endpoint and reset at midnight UTC.

In addition to the API key, you need a valid client ID before the request
succeeds. Keep a print out of the receipt for your expense report. The SKU
field identifies the product variant returned in the catalog response.

Terminate the instance when the job finishes to avoid ongoing charges.
The service hangs on to the connection until the client disconnects,
which is expected behavior under load.

## Additional anchor near-misses

This section tests near-misses of the anchor gaps closed in the task-10
fix wave audit that added `microsoft/az-state-failure`,
`microsoft/az-real-replacements`, and `microsoft/no-click` exclusions.
Every phrase below reads as compliant prose and must not be flagged.

The ten pairs this same wave reclassified to detection-only or fix-false
are intentionally absent below. Each one now flags every occurrence for
human review instead of skipping compliant text. That is what
detection-only means. Their protection lives in the coverage checks inside
`preset-microsoft.test.ts` rather than a zero-findings entry here.

Once you get the hang of the API requests become second nature. Support
tickets hang tight in the queue until an engineer picks them up.

Keep the print out safe for your expense report. Attach the print out to
the support ticket if the charge looks wrong.

The dashboard reports click count and click rate for each button. The
analytics API returns clicks per session for the funnel.

Write a SQL query to fetch the rows. Review the SQL before running it
against production.

## Fix-posture near-misses (unrelated legitimate senses)

Unlike the anchor gaps above, the four phrases below are ones the
fix-posture task explicitly scopes so the clean fixture doesn't visibly
misfire on them, even though detection-only rules can no longer corrupt
anything.

Tensions remain high near the DMZ dividing North and South Korea.

Traders watched the ask tick higher throughout the session.

So the CLI can find the user's home directory for its config files.

The contractor built the connector on spec, without a signed agreement in
place.

## Resources

For a full list of endpoints, see the [API reference](https://example.com/reference).
For an overview of authentication, see the [authentication guide](https://example.com/auth).
