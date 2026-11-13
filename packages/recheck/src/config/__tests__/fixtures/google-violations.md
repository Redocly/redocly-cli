## Getting started

This fixture deliberately violates every rule `recheck/google` ships. The
first line above is a level-2 heading (not level-1), which alone violates
`google/first-line-h1`.

# Google style guide violations

## Setup

#### Skipped heading level

That heading skipped a level (h2 straight to h4), violating
`google/heading-increment`.

## Notes

Some notes go here.

## Notes

A second heading with identical text violates `google/no-duplicate-heading`.

## Configuration options.

That heading ends with a period, violating `google/no-trailing-punctuation`.

##

The heading directly above has no text content, violating
`google/no-empty-headings`.

**Getting started**

The paragraph above is entirely bold text standing in for a heading,
violating `google/no-emphasis-as-heading`.

## See [the reference guide](https://example.com/docs) for details

That heading contains a link, violating `google/no-link-in-heading`.

## Configure The Server For Production Use

That heading is Title Case, violating `google/heading-sentence-case`.

## Use the `config.yaml` file

That heading contains a code span, violating `google/no-code-in-heading`.

## Step 1: Configure the environment

That heading uses a sequence number, violating `google/no-numbered-headings`.

- lowercase item text that should have started with a capital letter

The list above has one item (violating `google/list-length`, whose default
minimum is 2) whose text starts with a lowercase letter (violating
`google/list-item-capital`).

![](https://example.com/image.png)

The image above has empty alt text, violating `google/no-alt-text`.

<table>
<tr><td colspan="2">Merged cell</td></tr>
</table>

The raw HTML table above uses `colspan`, violating `google/no-merged-cells`.

This sentence has more than twenty-five words in it on purpose so that it
clearly exceeds the recommended sentence length limit that Google publishes
for accessible documentation and readability, violating `google/sentence-length`.

# Additional violations

This document has more than one level-1 heading, which is itself a style
violation, but `google/single-h1`'s specific token rule only reports it
when nothing but comments/frontmatter precede the FIRST level-1 heading —
this file's very first line is a level-2 heading on purpose (to trigger
`google/first-line-h1` above), so that precondition can't also hold here.
See `google-violations-single-h1.md` for `single-h1`'s own isolated
trigger, and this fixture's test for why the two live in separate files.

## Voice, person, tense, and contractions

We recommend enabling two-factor authentication for every account.
The server is not reachable during scheduled maintenance windows.
It mightn't've been configured correctly the first time.
Let's configure the webhook now.
Please note that this endpoint is deprecated.
Please click Submit to save your changes.

## Timeless documentation

As of this writing, the API supports only JSON responses.

## Latinisms, abbreviations, and slang

Configure the timeout value, i.e. the maximum wait time.
Restart the service, e.g. through the admin console.
Configure the primary region vs. the backup region.
The setting is aka the legacy flag in older releases.
Swap the primary and the replica, or vice versa, during failover.
TL;DR: restart the service and check the logs.
Authenticate via the OAuth flow before calling the API.
Refer to the U.R.L. provided in the confirmation email.
Support is limited to the U.S.A. region for now.
Send documents c/o the compliance department.
Configure the timeout w/ the provided defaults.

## Numbers, dates, and units

This is the 1st step in the process.
Progress reached 42 % completion.
The report is due on 12/02/2017.
The meeting starts at 9am sharp.
See RFC2318 for details.
Downloads are capped at 10 MB/s.

## Punctuation

Configure logging & monitoring for the service.
This plan is valid for 3 -- 5 days.
This is one sentence.  This one has two spaces before it.
However the server may reject the request.
This is the version, that supports webhooks.
The response contains neither errors or warnings.
Configure the timeout and/or retry count as needed.

## Links

For setup instructions, see [this document](https://example.com/setup).
Read more at [https://example.com/docs](https://example.com/docs).
For more information on rate limits, see the reference.
Read the ["Getting Started"](https://example.com/start) guide first.
This article explains how to configure webhooks.

<a href="https://example.com" target="_blank">External site</a>

## Text formatting

This option is *deprecated* and will be removed in a future release.
This step is __important__ for security.
<u>Underlined text</u> should be avoided outside of links.
Name your variables using camelCase or snake_case conventions.

## Code in text

The `Endpoint`'s configuration is stored separately from the client.

## UI elements and verbs

Click on the Submit button to proceed.
Hover over the icon to see more details.
Uncheck the box to disable notifications.
Scroll to the Configuration section for more options.
You need to toggle the setting to enable dark mode.
Press Ctrl+C to copy the selected text.
Click the "Next" button to continue.
See chapter 3 for advanced configuration.

## Plain language and wordiness

This setting allows you to customize the timeout.
In order to enable this feature, update the config file.
Utilize the provided SDK to integrate faster.
Leverage the caching layer to reduce latency.
The new algorithm is more performant than the old one.
Copy and paste the following snippet into your terminal.
Create a new project before continuing.
Run the following command to install dependencies.
Consider the pros and cons before switching providers.

## Product and brand names

Deploy the workload on GCP for better scaling.
Cloud Platform pricing varies by region and usage tier.
Export the file as markdown for the docs site.
Sign in with your Google account to continue.
FinTech Group AG connects to the drive over an I-O interface.

## Compound and one-word forms

Store the uploaded file in the data store for later retrieval.
Run the data cleansing job before the nightly export.
Configure the datasource bean before starting the application.
The service communicates over IPSec tunnels.
The colo hosts the racks for the regional deployment.
Signatures are computed with SHA1 in the legacy configuration.
Character data is encoded as UNICODE in the legacy exporter.
The tunnel uses IPSEC for encryption in the legacy exporter.

## Inclusive and precise language

Replicate data from the primary to the slave node.
Add the domain to the blacklist to block it.
A black hat actor attempted to exploit the vulnerability.
The QA team performed black-box testing on the release.
The button appears grayed-out until you sign in.
Existing customers are grandfathered into the old pricing.
The migration took twenty man hours to complete.
The support team is a ninja at debugging these issues.
The stack trace looked crazy after the update.
Pass a dummy variable as a placeholder for the missing field.
Don't be blind to the security implications of this change.
The app added support for unsighted users this quarter.
The article describes a person suffering from chronic outages.
The fat client caches most of the data locally.
