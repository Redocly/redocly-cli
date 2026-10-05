# Microsoft style guide violations

This fixture deliberately violates every rule `recheck/microsoft` ships.

## Configure The Server For Production Use

That heading is Title Case, violating `microsoft/heading-sentence-case`.

## Setup: this section covers installation

The word after the colon in that heading should be capitalized, violating
`microsoft/capitalize-after-heading-colon`.

## Configuration options.

That heading ends with a period, violating `microsoft/no-trailing-punctuation`.

## Logging & monitoring

That heading uses an ampersand, violating `microsoft/no-ampersand-in-headings`.

## Client versus server configuration

That heading spells out "versus" instead of "vs.", violating
`microsoft/vs-in-headings`.

Configure the primary region vs. the backup region. That paragraph uses
"vs." in body text, violating `microsoft/versus-in-text`.



The three blank lines above this paragraph violate
`microsoft/no-multiple-blanks`.

**Getting started**

The paragraph above is entirely bold text standing in for a heading,
violating `microsoft/no-emphasis-as-heading`.

The platform shipped its first stable release back in the 1990's, and this
sentence has no other purpose than to violate
`microsoft/no-apostrophe-plural-decade`.

Configure an URL for the webhook endpoint before you continue. That sentence
uses "an URL" instead of "a URL", violating `microsoft/article-before-acronym`.

- lowercase item text that should have started with a capital letter
- a second item so the list has at least two entries

The first item above starts with a lowercase letter, violating
`microsoft/list-item-capital`.

- The first item in this list
- The second item, which ends with the word and

The second item above ends with a dangling conjunction, violating
`microsoft/no-trailing-conjunction-list`.

| Field name... | Description |
| --- | --- |
| name | The resource name |
| region | The deployment region |

The column header above ends with an ellipsis, violating
`microsoft/no-ellipsis-column-header`.

| Field | Description |
| --- | --- |
| name | — |
| region | The deployment region |

The cell above is a bare em dash instead of "Not applicable" or "None",
violating `microsoft/no-blank-table-cell`.

This is one sentence.  This one has two spaces before it, violating
`microsoft/single-space-after-punctuation`.

This plan is valid for ten days — starting today — which is one way to
violate `microsoft/no-space-around-em-dash` with a spaced em dash.

The maintenance window runs from 10–20 minutes depending on load, violating
`microsoft/no-from-before-en-dash-range` by using "from" before an en dash.

The setting is called “advanced mode” in the configuration file, violating
`microsoft/straight-quotes` with curly quotation marks.

This is the 1st step in the setup process, violating
`microsoft/spell-out-ordinals`.

Restart the service firstly, then check the logs, violating
`microsoft/ordinal-no-ly`.

The maintenance window begins at 12:00 PM sharp, violating
`microsoft/noon-midnight`.

![](https://example.com/image.png)

The image above has empty alt text, violating `microsoft/no-alt-text`.

![This extremely long piece of alt text goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on well past one hundred and fifty characters just to violate the length rule.](https://example.com/diagram.png)

The alt text above is far longer than 150 characters, violating
`microsoft/alt-text-length`.

![no capital letter and no ending period](https://example.com/shot.png)

The alt text above does not start with a capital letter or end with a
period, violating `microsoft/alt-text-format`.

![Image of the dashboard after signing in](https://example.com/dash.png)

The alt text above starts with the generic word "Image", violating
`microsoft/alt-text-generic-opener`.

![Screenshot of the settings panel.png](https://example.com/settings.png)

The alt text above uses an image file name, violating
`microsoft/alt-text-no-filename`.

For setup instructions, [click here](https://example.com/setup).

The link text above is a generic phrase, violating
`microsoft/descriptive-link-text`.

This paragraph exists only to run past the guide's recommended paragraph
length. It adds one short sentence. Then it adds another one. Then another.
Then a fifth. Then a sixth. Then a seventh. Then an eighth sentence, which
is one too many and violates `microsoft/paragraph-length`.

- Configure the client
- Store the credentials
- Rotate the keys
- Review the logs
- Update the dependencies
- Restart the service
- Notify the team
- Archive the report

The list above has eight items, more than the guide's recommended maximum
of seven, violating `microsoft/list-length`.

This sentence, which has several clauses, uses far, far too many commas,
unnecessarily, violating `microsoft/comma-density`.

## Voice and contractions

Configure the settings so the request will not fail and the service does
not restart unexpectedly, which is one way to violate
`microsoft/use-contractions`.

There'd be no reason to skip this step, violating
`microsoft/no-awkward-contractions`.

The setting can't be changed after deployment. Elsewhere in this file the
setting cannot be changed either, which conflicts with the first-used
contraction and violates `microsoft/contraction-consistency`.

There are several reasons to prefer this approach, violating
`microsoft/no-weak-phrasing`.

Please configure the timeout before you continue, violating
`microsoft/avoid-please`.

## US spelling and Latin abbreviations

Configure the data centre before you continue, violating
`microsoft/us-spelling-detect`.

The dashboard shows your favourite reports at the top, violating
`microsoft/us-spelling`.

Configure the timeout value, e.g. the maximum wait time, violating
`microsoft/no-latin-abbreviations`.

Avoid de facto standards when an open specification exists, violating
`microsoft/no-latin-abbreviations-detect`.

## Grammar usage and navigation (context-scoped, detection-only)

As well as being fast, the API is reliable, violating
`microsoft/az-grammar-usage-detect`.

A score of 80 or higher is required to pass, violating
`microsoft/az-grammar-usage-detect`.

Please visit the dashboard for details, violating
`microsoft/az-navigation-detect`.

## Simple words and word choice

Utilize the provided SDK to integrate faster, violating
`microsoft/simple-words`.

Leverage the caching layer to reduce latency, violating
`microsoft/leverage`.

Don't use a glyph when a plain symbol will do, violating
`microsoft/glyph`.

Don't bucketize unrelated settings together, violating
`microsoft/bucketize`.

This change will impact performance significantly, violating
`microsoft/impact-verb`.

The ask from the team was to ship the feature early, violating
`microsoft/the-ask`.

## Bias-free and militaristic language

The chairman of the committee approved the proposal, violating
`microsoft/bias-free-terms`.

Security teams must prepare for a cyber attack before it happens, violating
`microsoft/cyberattack-spelling`.

The workshop asked everyone to find their spirit animal, violating
`microsoft/no-derogatory-slang`.

The report describes asian markets in the region, violating
`microsoft/racial-ethnic-capitalization`.

Don't describe a customer as handicapped in support documentation, violating
`microsoft/accessibility-terms`.

This legacy documentation still describes the replication setup using
master/slave terminology, violating `microsoft/master-slave`.

## Spelling and hyphenation

Send the confirmation by e-mail once setup completes, violating
`microsoft/spelling-hyphenation`.

Hover over the ToolTip to see additional details, violating
`microsoft/tooltip-capitalization`.

## Case-only and verb-able terms

Configure access to the Internet before you continue, violating
`microsoft/az-case-only`.

The rollout uses Big Data to model demand, violating
`microsoft/az-case-fixable`.

The response field returns a boolean summary for each check, violating
`microsoft/az-case-fixable-detect`.

Add the domain to the whitelist to allow it, violating
`microsoft/az-verb-able`.

## A-Z terminology

The application hangs when the request queue overflows, violating
`microsoft/az-state-failure`.

The service will crash unexpectedly during heavy load, violating
`microsoft/az-state-failure-detect`.

Exit the application to close it when you're done, violating
`microsoft/az-lifecycle-verbs`.

Quit the application without saving your changes, violating
`microsoft/az-lifecycle-verbs-detect`.

Finalize the configuration before deployment, violating
`microsoft/az-judgment-words`.

The dashboard surfaces actionable data for the on-call team, violating
`microsoft/actionable`.

The service is only available in the Far East region, violating
`microsoft/az-geography`.

Thank you for your patience during the migration, violating
`microsoft/az-geography-detect`.

The icon appears in the top left corner of the window, violating
`microsoft/az-direction-layout`.

The icon appears in the bottom left corner of the window, violating
`microsoft/az-direction-layout-detect`.

Use the left-hand navigation menu to switch sections, violating
`microsoft/left-hand-right-hand`.

Open the blade to configure additional settings, violating
`microsoft/az-ui-nouns`.

Use the hierarchical menu to organize the categories, violating
`microsoft/az-ui-nouns-detect`.

Change the typeface used in the report header, violating
`microsoft/az-typography`.

Use italics to emphasize the warning text, violating
`microsoft/italic-as-noun`.

Files are stored in a child folder of the project directory, violating
`microsoft/az-filesystem`.

The team moved towards the new architecture, violating
`microsoft/az-grammar-usage`.

Configure the retry count whether or not the request succeeds, violating
`microsoft/az-grammar-usage-substitutions`.

Defrag the volume before running the benchmark, violating
`microsoft/az-abbreviations-names`.

Convert the value to hex before storing it, violating
`microsoft/az-abbreviations-substitutions`.

The World Wide Web connects billions of devices, violating
`microsoft/world-wide-web`.

Support is limited to USA customers for now, violating
`microsoft/usa-abbreviation`.

Use the pound sign to comment out the line, violating
`microsoft/az-abbreviations-names-detect`.

Use the hot link at the bottom of the page to reach support, violating
`microsoft/az-navigation`.

Bookmark this page for quick access later, violating
`microsoft/bookmark-favorite`.

Don't treat the service as a black box during debugging, violating
`microsoft/az-no-replacement`.

Configure the friendly name shown to other users, violating
`microsoft/az-real-replacements`.

## UI verbs

Click on the Submit button to save your changes, violating
`microsoft/no-click`.

Press Enter to confirm the selection, violating
`microsoft/press-key-verb`.

Uncheck the box to disable notifications, violating
`microsoft/checkbox-verbs`.

Close the dialog box after reviewing the summary, violating
`microsoft/dialog-terminology`.

Mouse over the icon to see more details, violating
`microsoft/mouse-over`.

Press Ctrl + C to copy the selected text, violating
`microsoft/keyboard-shortcut-plus-spacing`.

Log in to the portal using your organization credentials, violating
`microsoft/sign-in-sign-out`.
