# Where the index pays and where the description already is one

{% admonition type="info" name="Pilot" %}
This is the pilot of the third benchmark: one model (Opus 5), two runs a cell, on a build of PR #3005 at `0203f1081`.
The full grid over four models and three repeats lands here once the next snapshot is published.
{% /admonition %}

The [second benchmark](./tree-agent-index-benchmark-v2.md) asked whether the flow an agent produces would actually run, over three descriptions that were all one file.
This one adds two descriptions chosen to be hard in new ways — Stripe, whose schemas are enormous, and DigitalOcean, which ships as 2,909 files with one operation each — and asks where an index still earns its place.

Five descriptions, two conditions, and the same check as before: the answer must name every required call, the host it goes to, the fields the body needs, and the way it authenticates.

- **no tree** — the task and the path to the description. Neither `tree` nor Redocly is named.
- **tree** — the same task plus two lines: the CLI is installed, and `redocly tree --help` lists what it can select.

## The head-to-heads

{% tabs %}

{% tab label="GitHub REST · 10.0 MB" %}

**Task:** a CI job that publishes a release, attaches the built zip, and can take that file back down, authenticating as a GitHub App installation.
Expected: `POST /app/installations/{id}/access_tokens` → `POST /releases` → the asset upload → `DELETE /releases/assets/{asset_id}`.
Traps: the upload overrides its server to `https://uploads.github.com`, and the delete is keyed by asset, not release.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I want a CI job that publishes a release for a repository, attaches the built zip to it,
and can take that file back down if the upload turns out wrong. Work out what it calls.
The CI authenticates as a GitHub App installation.

API description: github-api.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree github-api.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Run            |     no tree |        tree |
| -------------- | ----------: | ----------: |
| Opus 5 · run 1 | 18,798 / 11 | 14,959 / 10 |
| Opus 5 · run 2 | 16,870 / 16 |  15,630 / 9 |
| median         | 18,798 / 16 | 15,630 / 10 |

Difference on the medians: −17% context.

What those runs were billed:

| Run            | no tree |  tree |
| -------------- | ------: | ----: |
| Opus 5 · run 1 |   $0.69 | $0.62 |
| Opus 5 · run 2 |   $0.63 | $0.60 |
| median         |   $0.69 | $0.62 |

Difference on the medians: −10%.

All four runs produced a flow that passes the check.
A run works when its flow contains the installation token call, `POST /releases`, the asset upload sent to `uploads.github.com`, and the delete keyed by asset id.

What each run ran:

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "^  /.*releases|^  /.*assets|^  /app/installations|access_tokens" github-api.yaml
grep -n "releases" github-api.yaml | head -60
grep -n "^  '/repos/{owner}/{repo}/releases" github-api.yaml; grep -n "^  '/repos/{owner}/{repo}/releases/assets" github-api.yaml
sed -n '53272,53552p' github-api.yaml
sed -n '53843,53963p' github-api.yaml
sed -n '3419,3509p' github-api.yaml
grep -n "^  '/repos/{owner}/{repo}/installation'" github-api.yaml; sed -n '45238,45272p' github-api.yaml; grep -n "    contents:" -A6 github-api.yaml | grep -n "releases" | head
sed -n '45809,45850p' github-api.yaml; echo ---; sed -n '86275,86300p' github-api.yaml; echo ---WORKFLOWS; grep -n "        workflows:" -A6 github-api.yaml | head -20
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "    installation-token:" -A20 github-api.yaml | head -30; echo ---ASSET; grep -n "^    release-asset:" -A40 github-api.yaml | head -50; echo ---PARAMS; grep -n "^    asset-id:" -A8 github-api.yaml; grep -n "^    release-id:" -A8 github-api.yaml
sed -n '53730,53800p' github-api.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help; ls
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30; echo ===; redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -120
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -40
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset | head -40; echo "=== DELETE ASSET"; redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -20; echo "=== REL"; redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -20; echo "=== INST"; redocly tree github-api.yaml --format=ai --find "get a repository installation" | head -8
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -12; echo "=== SEC"; redocly tree github-api.yaml --format=ai --component=securitySchemes | head -20; echo "=== VERIFY ASSET"; redocly tree github-api.yaml --format=ai --operation=repos/get-release-asset | head -12
cd /Users/tora/bench-run/github-api-tree-help-local-opus-r1; redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases | head -8; echo "=== UPD"; redocly tree github-api.yaml --format=ai --operation=repos/update-release | grep -o '"requestBody".*"responses"' | head -c 2000
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "^  /.*:" github-api.yaml
grep -n "^paths:\|^  \S" github-api.yaml | head -50
grep -n "releases\|/assets" github-api.yaml | grep -n "'\|\"" | head -60
sed -n '53272,53440p' github-api.yaml
sed -n '53843,53960p' github-api.yaml; echo "=== ASSET_ID ==="; sed -n '53431,53545p' github-api.yaml
grep -n "'/app/installations/{installation_id}/access_tokens'\|'/repos/{owner}/{repo}/installation'\|^  /app/installations" github-api.yaml
grep -n "securitySchemes" -A 20 github-api.yaml | head -30; echo "=== SERVERS ==="; grep -n "^servers:" -A 5 github-api.yaml
sed -n '3419,3520p' github-api.yaml
sed -n '45809,45860p' github-api.yaml
sed -n '45238,45285p' github-api.yaml; echo "=== check-immutable-releases schema ==="; grep -n "check-immutable-releases:" -A 30 github-api.yaml | head -40
grep -n "    release-asset:" -A 45 github-api.yaml | head -55
grep -n "        contents:" -A 8 github-api.yaml | sed -n '1,20p'; echo "=== workflows perm ==="; grep -n "        workflows:" -A 8 github-api.yaml | head -20
awk 'NR>=90700 && NR<=90870' github-api.yaml | grep -n "upload_url\|^    release:\|  id:\|html_url"
grep -n "^    release:" -A 60 github-api.yaml | grep -n "upload_url\|id:\|tag_name\|assets_url\|title:" | head -20; echo "=== app-permissions contents ==="; sed -n '86380,86426p' github-api.yaml
sed -n '53685,53780p' github-api.yaml | grep -n "patch:\|operationId\|draft\|make_latest\|required\|tag_name\|'200'\|delete:"
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help | head -60
redocly tree github-api.yaml --format=ai --find "release" | head -80
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30; echo "=== INSTALL TOKEN ==="; redocly tree github-api.yaml --format=ai --find "installation access token" | head -30
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token --with-deps | head -120
redocly tree github-api.yaml --format=ai --operation=repos/create-release --with-deps | head -40
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset --with-deps | head -30; echo "=== DELETE ==="; redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/installation" | head -20; echo "=== TOP ==="; redocly tree github-api.yaml --format=ai | head -25
redocly tree github-api.yaml --format=ai --operation=repos/update-release | head -12; echo "=== IMM ==="; redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases --with-deps | head -12; echo "=== GETINST ==="; redocly tree github-api.yaml --format=ai --operation=apps/get-repo-installation | head -10
redocly tree github-api.yaml --format=ai --operation=apps/revoke-installation-access-token | head -6; echo "=== LIST ASSETS ==="; redocly tree github-api.yaml --format=ai --find "list release assets" | head -6
```

{% /tab %}
{% /tabs %}

Both sides pass both runs; the index answers with 17% less context at about the same price.

{% /tab %}

{% tab label="Billing API · 1.3 MB" %}

**Task:** put an existing customer onto a recurring plan, with nothing else set up yet.
Expected: `POST /products` → `POST /plans` → `POST /subscriptions`.
Traps: the subscription body requires `orderType`, `customerId`, `websiteId` and `items`, and every call needs the `SecretApiKey` key in the `REB-APIKEY` header.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're moving existing customers onto monthly recurring billing. One of them is already in
the system, nothing else is set up yet. Work out what our backend has to call to get that
customer onto a recurring plan.

API description: rebilly.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree rebilly.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Run            |     no tree |        tree |
| -------------- | ----------: | ----------: |
| Opus 5 · run 1 | 44,355 / 51 | 34,080 / 20 |
| Opus 5 · run 2 | 45,744 / 39 | 40,281 / 26 |
| median         | 45,744 / 51 | 40,281 / 26 |

Difference on the medians: −12% context.

What those runs were billed:

| Run            | no tree |  tree |
| -------------- | ------: | ----: |
| Opus 5 · run 1 |   $2.38 | $1.13 |
| Opus 5 · run 2 |   $2.04 | $1.14 |
| median         |   $2.38 | $1.14 |

Difference on the medians: −52%.

All four runs produced a flow that passes the check.
A run works when its flow contains `POST /products`, `POST /plans` and `POST /subscriptions`, names `orderType`, `customerId`, `websiteId` and `items`, and sends the key in the `REB-APIKEY` header.

What each run ran:

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -200
sed -n '31374,31530p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    PaymentToken:\|^    Token:\|^    PaymentCardToken" rebilly.yaml
sed -n '12201,12260p' rebilly.yaml && echo ===== && grep -n "ProductCreate\|PlanCreate\|Plan:$\|productFields\|planFields" rebilly.yaml | head -40
grep -n "^    SubscriptionPlan:" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "^    PlanPriceFormula:\|^    FixedPriceFormula:\|^    PlanTrial:\|^    PlanSetup:" rebilly.yaml
sed -n '11615,11640p' rebilly.yaml && echo "=====" && grep -n "^    FixedPricing:\|^    QuantityBasedPricing\|Pricing:$" rebilly.yaml | head
grep -n "^    PlanFormulaFixedFee:" rebilly.yaml
sed -n '11168,11215p' rebilly.yaml
sed -n '15233,15420p' rebilly.yaml
sed -n '15420,15700p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15503,15520p;15537,15580p' rebilly.yaml && echo "=== items schema ===" && grep -n "^    SubscriptionItem\|^    OrderItem" rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml
grep -n "^    OriginalPlan:" rebilly.yaml
sed -n '12321,12360p' rebilly.yaml
grep -n "websites" rebilly.yaml | head -20 && echo "=== WebsiteId ===" && grep -n "^    WebsiteId:" rebilly.yaml
sed -n '37280,37360p' rebilly.yaml && echo "=== 2897 ===" && sed -n '2897,2915p' rebilly.yaml
sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30640p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20480p' rebilly.yaml && echo "=== CreatePaymentInstrument ===" && grep -n "^    CreatePaymentInstrument\|^    PaymentCardPaymentInstrument\|CreatePaymentCard" rebilly.yaml | head -20
grep -n "^    PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10960p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "^    CompositeToken:" rebilly.yaml && sed -n '17081,17140p' rebilly.yaml
sed -n '17801,17830p' rebilly.yaml && echo "=== token prop ===" && grep -n "^        token:" rebilly.yaml | sed -n '1,20p'
sed -n '17140,17200p' rebilly.yaml
sed -n '32620,32700p' rebilly.yaml
sed -n '28565,28640p' rebilly.yaml
sed -n '35340,35420p' rebilly.yaml
sed -n '35258,35340p' rebilly.yaml | grep -n "requestBody\|schema\|\$ref\|summary\|operationId"
grep -n "    TransactionRequest:" rebilly.yaml && grep -n "^    CreateTransaction\|^    TransactionCreate" rebilly.yaml
sed -n '20508,20530p' rebilly.yaml
sed -n '20530,20700p' rebilly.yaml | grep -n "^              [a-zA-Z]*:"
sed -n '20532,20562p;20573,20590p' rebilly.yaml && echo "=== PaymentInstruction ===" && grep -n "^    PaymentInstruction:" rebilly.yaml
sed -n '18000,18090p' rebilly.yaml
sed -n '160,200p' rebilly.yaml && echo "=== security schemes ===" && grep -n "  securitySchemes:" rebilly.yaml
sed -n '192,270p' rebilly.yaml
grep -n "subscriptionExpand:" rebilly.yaml && grep -n "defaultPaymentInstrument" rebilly.yaml | head
sed -n '447,470p' rebilly.yaml && echo "===" && sed -n '3540,3580p' rebilly.yaml
awk 'NR>=3400 && NR<=3545 && /^    [A-Za-z]+:/ {print NR": "$0}' rebilly.yaml && echo "=== VaultedInstrument ===" && grep -n "^    VaultedInstrument:" rebilly.yaml
sed -n '3096,3130p' rebilly.yaml && echo "=== customers/{id} PATCH ===" && sed -n '26100,26180p' rebilly.yaml | grep -n "patch:\|operationId\|requestBody\|\$ref"
awk 'NR>=25986 && NR<=26221 && (/^    (get|patch|put|delete|post):/ || /operationId:/ || /requestBody:/)' rebilly.yaml
awk 'NR>=31090 && NR<=31135' rebilly.yaml | grep -n "post:\|operationId\|requestBody\|\$ref\|'201'" && echo "=== requestBodies Plan ===" && grep -n "^    Plan:$" rebilly.yaml
grep -n "^    ServicePeriodAnchorInstruction:" rebilly.yaml && sed -n "$(grep -n '^    ServicePeriodAnchorInstruction:' rebilly.yaml | cut -d: -f1),+45p" rebilly.yaml
sed -n "$(grep -n '^    Invoice:' rebilly.yaml | head -1 | cut -d: -f1),+80p" rebilly.yaml | grep -n -A14 "status:" | head -40
grep -n "^    InvoiceStatus\|abandoned$" rebilly.yaml | head -5; grep -n "          - past-due" rebilly.yaml | head
sed -n '6840,6862p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --find "plan" | head -30; echo ===; redocly tree rebilly.yaml --format=ai --find "product" | head -25; echo ===; redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -40
redocly tree rebilly.yaml --format=ai --find "product" | head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --find "payment-instrument" | head -40
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps | head -150
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps | head -60; echo "-----"; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps | head -120
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --find "website" | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan|head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=PostPaymentInstrument|head -10; echo "-----"; redocly tree rebilly.yaml --format=ai --find "token"|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | tr ',' '\n' | grep -n -A6 -E '"(autopay|paymentInstrumentId|startTime|websiteId|items|customerId|orderType|currency|delinquencyPeriod)"' | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject|head -6; echo "-----"; redocly tree rebilly.yaml --format=ai --path=/customers|head -20; echo "-----"; redocly tree rebilly.yaml --format=ai --operation=PostToken|head -12
redocly tree rebilly.yaml --format=ai --operation=GetCustomerCollection|head -8; echo "-----"; redocly tree rebilly.yaml --format=ai --find "gateway-account"|head -12; echo "-----"; redocly tree rebilly.yaml --format=ai --find "invoices"|head -12
redocly tree rebilly.yaml --format=ai --path="/customers/{id}"|head; echo "-----"; redocly tree rebilly.yaml --format=ai --component=parameters --name=collectionFilter|head -6
grep -n -A6 "^servers:" rebilly.yaml | head -20
sed -n 166,200p rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee|head -5; echo "-----"; redocly tree rebilly.yaml --format=ai --component=parameters --name=subscriptionExpand|head -5
redocly tree rebilly.yaml --format=ai --component=schemas --name=CompositeToken|head -5
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|sed -n 3p | head -c 2000
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken|sed -n 4p | head -c 2500
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -300
sed -n '31374,31560p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument:\|^    PaymentCardToken\|^    Token:\|^  requestBodies:\|^  schemas:\|^    Website:\|^    GatewayAccount" rebilly.yaml
sed -n '12201,12320p' rebilly.yaml && echo ==== && sed -n '20455,20500p' rebilly.yaml
sed -n '20455,20500p' rebilly.yaml; grep -n "    SubscriptionPlan:" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSale:\|    PlanPriceFormula:\|    NewSubscription\|    SubscriptionItem" rebilly.yaml
sed -n '11615,11700p' rebilly.yaml && echo "=====" && sed -n '16038,16300p' rebilly.yaml
sed -n '15233,15500p' rebilly.yaml
sed -n '15500,15800p' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
sed -n '15503,15520p;15537,15546p;15564,15582p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSaleItem:\|    OriginalPlan:\|    FlexiblePlan:\|    WebsiteId:" rebilly.yaml
sed -n '2897,2910p;12321,12360p;15099,15140p' rebilly.yaml
grep -n "websites:\|GetWebsiteCollection\|/websites" rebilly.yaml | head -20
sed -n '37286,37292p' rebilly.yaml && sed -n '30460,30790p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml && grep -n "    PaymentInstrumentCreateToken:\|    PaymentCardCreatePlain:" rebilly.yaml
sed -n '20441,20455p;10820,10990p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "    CompositeToken:" rebilly.yaml && sed -n '17081,17160p' rebilly.yaml
sed -n '17160,17200p;17801,17830p' rebilly.yaml
grep -n "    PlanFormulaFlatRate:\|    PlanFormulaFixedFee:\|    PlanTrial:\|    ServicePeriodAnchorInstruction:" rebilly.yaml
sed -n '11168,11280p;11743,11800p' rebilly.yaml
sed -n '31100,31182p' rebilly.yaml | grep -n "post:\|requestBody\|\$ref\|responses\|'201'" ; echo ---; sed -n '32660,32790p' rebilly.yaml | grep -n "post:\|requestBody:\|\$ref:\|'201'\|description:" | head -40
sed -n '32610,32665p' rebilly.yaml; echo ---SERVERS---; sed -n '1,60p' rebilly.yaml | grep -n "url:\|servers:"; grep -n "^servers:" rebilly.yaml
sed -n '166,185p' rebilly.yaml; grep -n "  securitySchemes:" rebilly.yaml
sed -n '192,260p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml
sed -n '3261,3300p' rebilly.yaml; grep -n "^    Contact:" rebilly.yaml
grep -n "^    Customer:" rebilly.yaml
sed -n '3509,3700p' rebilly.yaml | grep -n "^        [a-zA-Z]*:"
sed -n '3543,3570p' rebilly.yaml
grep -n "^    VaultedInstrument:" rebilly.yaml | head -1; sed -n '25986,26010p' rebilly.yaml | grep -n "patch:\|put:\|get:\|operationId"
sed -n '3096,3115p' rebilly.yaml; grep -n "operationId: P.*Customer\b\|operationId: PatchCustomer\|operationId: PutCustomer" rebilly.yaml
sed -n '26030,26060p' rebilly.yaml; sed -n '3115,3140p' rebilly.yaml
sed -n '3509,3515p' rebilly.yaml
grep -n "REB-\|apiVersion" rebilly.yaml | head
grep -n "    SchedulingMethodImmediately:" rebilly.yaml
sed -n '6536,6560p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree rebilly.yaml --format=ai --find "subscription" | head -60
redocly tree rebilly.yaml --format=ai --find "plan" | head -60
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -200
redocly tree rebilly.yaml --format=ai --find "product" | head -40
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription --with-deps | head -60
redocly tree rebilly.yaml --format=ai --find "website" | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -40; echo ====; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -20
redocly tree rebilly.yaml --format=ai --find "payment instrument" | head -40; echo ====; redocly tree rebilly.yaml --format=ai --find "payment token" | head -25
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee | head -20; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula | head -10
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrumentCreateToken | head -20
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument | head -20; redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken | head -12
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head; redocly tree rebilly.yaml --format=ai --find "organization"|head -20
sed -n '15234,15364p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
grep -n "autopay:" -A 12 rebilly.yaml | sed -n '1,60p'
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer | head -12
sed -n '15364,15484p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
grep -n "paymentInstrumentId:" -A 8 rebilly.yaml | sed -n '/15[45][0-9][0-9]/,+10p' | head -20; echo ---; redocly tree rebilly.yaml --format=ai --path=/customers/{id}|head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Plan|head -8; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostPlan|head -10; echo ---; redocly tree rebilly.yaml --format=ai --operation=PostProduct|head -10
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject|head -8
grep -n "^servers:" -A 8 rebilly.yaml; grep -n "REB-APIKEY" -B4 -A4 rebilly.yaml | head -30
sed -n '166,196p' /Users/tora/bench-run/rebilly-tree-help-local-opus-r2/rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentInstrument|head -4; redocly tree rebilly.yaml --format=ai --component=schemas --name=VaultedInstrument|head -4
```

{% /tab %}
{% /tabs %}

Both sides pass both runs. This stays the index's best case — one 1.3 MB file that defeats search — at half the price: $1.14 against $2.38, 20 and 26 calls against 39 and 51.

{% /tab %}

{% tab label="Stripe · 6.1 MB" %}

**Task:** a paid tier with a 14-day free trial, billed monthly on the customer's saved card.
Expected: `POST /v1/products` → `POST /v1/prices` → `POST /v1/subscriptions`.
Traps: the legacy `/v1/plans` sits next to `/v1/prices` and still works; the trial rides on `trial_period_days`; the description has one tag for 589 operations, so tags navigate nothing.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're launching a paid tier for our product: an existing customer should get a 14-day
free trial and then be billed monthly on their saved card, automatically. Work out what
our backend has to call to set that up, end to end.

API description: stripe.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree stripe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Run            |     no tree |        tree |
| -------------- | ----------: | ----------: |
| Opus 5 · run 1 | 21,222 / 16 | 35,908 / 15 |
| Opus 5 · run 2 | 24,339 / 36 | 29,911 / 18 |
| median         | 24,339 / 36 | 35,908 / 18 |

Difference on the medians: +48% context.

What those runs were billed:

| Run            | no tree |  tree |
| -------------- | ------: | ----: |
| Opus 5 · run 1 |   $0.94 | $1.16 |
| Opus 5 · run 2 |   $1.54 | $1.22 |
| median         |   $1.54 | $1.22 |

Difference on the medians: −20%.

All four runs produced a flow that passes the check.
A run works when its flow contains `POST /v1/products`, `POST /v1/prices` (the legacy `/v1/plans` also counts) and `POST /v1/subscriptions` naming `customer`, `items` and `trial_period_days`, authenticated with the secret key.

What each run ran:

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
wc -l stripe.yaml; ls -la
grep -n "^  /v1/\(customers\|setup_intents\|subscriptions\|prices\|products\|payment_methods\|payment_intents\)[^:]*:" stripe.yaml | head -60
sed -n '132240,132420p' stripe.yaml
python3 -c "
import yaml,sys,json
d=yaml.safe_load(open('stripe.yaml'))
json.dump(d['paths'],open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/paths.json','w'))
print('ok', len(d['paths']))
"
(pip3 install pyyaml -q | tail -2); python3 -c "import yaml; print('ok')"
python3 - <<'EOF'
import yaml, json, pickle
d = yaml.safe_load(open('stripe.yaml'))
pickle.dump(d, open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/spec.pkl','wb'))
print(d.get('info'))
print(len(d['paths']))
EOF
cat > /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py <<'EOF'
import pickle, sys, json, textwrap
d = pickle.load(open('/private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/spec.pkl','rb'))
def body(path, method='post', depth=1):
op = d['paths'][path][method]
print('===', method.upper(), path, '|', op.get('operationId'))
print('DESC:', textwrap.shorten(str(op.get('description','')), 400))
rb = op.get('requestBody')
if not rb: print('(no body)'); return
sch = rb['content']['application/x-www-form-urlencoded']['schema']
req = set(sch.get('required') or [])
def walk(s, pre='', lvl=0):
for k,v in (s.get('properties') or {}).items():
r = '*' if k in (s.get('required') or []) else ' '
t = v.get('type') or ('anyOf' if 'anyOf' in v else '?')
en = v.get('enum')
print(f"{'  '*lvl}{r} {k}: {t}" + (f" enum={en}" if en else ''))
if lvl < depth:
sub = v
if 'anyOf' in v:
for a in v['anyOf']:
if a.get('type')=='object': sub=a
if sub.get('type')=='object' and sub.get('properties'):
walk(sub, lvl=lvl+1)
walk(sch)
if __name__ == '__main__':
for a in sys.argv[1:]:
p,_,m = a.partition('#')
body(p, m or 'post', depth=int(__import__('os').environ.get('DEPTH','1')))
python3 /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py /v1/subscriptions
import pickle, json
op=d['paths']['/v1/subscriptions']['post']
s=op['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('REQUIRED:', s.get('required'))
for k in ['customer','customer_account','items','trial_period_days','trial_end','trial_settings','payment_behavior','off_session','default_payment_method','collection_method','billing_mode']:
print('-----',k)
print(json.dumps(s['properties'][k], indent=1)[:2500])
DEPTH=0 python3 /private/tmp/claude-501/-Users-tora-bench-run-stripe-control-v3-opus-r1/a6c314e8-1a88-4424-ac87-617b1e210cd3/scratchpad/q.py /v1/products /v1/prices /v1/setup_intents | head -120
P=d['paths']
print([p for p in P if 'payment_method' in p or 'setup_intent' in p])
print()
s=P['/v1/prices']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('recurring:', json.dumps(s['properties']['recurring'], indent=1))
import pickle, json, textwrap
for path,m in [('/v1/customers/{customer}/payment_methods','get'),('/v1/payment_methods/{payment_method}/attach','post'),('/v1/customers/{customer}','post')]:
op=P[path][m]
print('===',m.upper(),path,op.get('operationId'))
print(textwrap.shorten(str(op.get('description')),300))
for p in op.get('parameters',[]):
print('  param',p['in'],p['name'],'req' if p.get('required') else '', p['schema'].get('enum') or p['schema'].get('type'))
rb=op.get('requestBody')
if rb:
s=rb['content']['application/x-www-form-urlencoded']['schema']
print('  body required:', s.get('required'))
print('   ', k, v.get('type') or 'anyOf', v.get('enum') or '')
P=d['paths']; C=d['components']['schemas']
s=P['/v1/customers/{customer}']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
print('invoice_settings:', json.dumps(s['properties']['invoice_settings'], indent=1)[:1200])
for name in ['subscription','setup_intent','payment_method']:
sch=C[name]
print('===',name,'props:', sorted(sch['properties'].keys()))
C=d['components']['schemas']
si=C['subscription_item']['properties']
print('sub_item props:', sorted(si.keys()))
print('status enum:', C['subscription']['properties']['status'].get('enum'))
print('latest_invoice:', json.dumps(C['subscription']['properties']['latest_invoice'])[:300])
inv=C['invoice']['properties']
print('invoice has confirmation_secret:', 'confirmation_secret' in inv, '| payment_intent:', 'payment_intent' in inv)
print('invoice props sample:', [k for k in sorted(inv) if 'pay' in k or 'confirm' in k or 'secret' in k])
print('si status:', C['setup_intent']['properties']['status'].get('enum'))
print('si usage:', C['setup_intent']['properties']['usage'])
print('invoice expandable:', C['invoice'].get('x-expandableFields'))
print('conf secret:', json.dumps(C['invoice']['properties']['confirmation_secret'], indent=1)[:600])
print('sub expandable:', C['subscription'].get('x-expandableFields'))
op=P['/v1/setup_intents/{intent}/confirm']['post']
print('confirm SI body:', list(s['properties'].keys()))
print(d.get('servers'))
print(json.dumps(d['components'].get('securitySchemes'), indent=1)[:600])
op=P['/v1/customers/{customer}'].get('get')
print('GET customer:', op.get('operationId'))
# check managed_payments (new?)
print(json.dumps(C['subscription']['properties']['managed_payments'])[:400])
s=d['paths']['/v1/webhook_endpoints']['post']['requestBody']['content']['application/x-www-form-urlencoded']['schema']
ev=s['properties']['enabled_events']['items'].get('enum')
print(len(ev) if ev else None)
want=[e for e in (ev or []) if e.startswith(('invoice.','customer.subscription','setup_intent.'))]
print(json.dumps(want, indent=0))
print('req:', s.get('required'))
print('props:', list(s['properties'].keys()))
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree stripe.yaml --format=ai --find "subscription" | head -80
redocly tree stripe.yaml --format=ai --operation=PostSubscriptions | head -150
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r1
redocly tree stripe.yaml --format=ai --find "customer payment method" | head -30
redocly tree stripe.yaml --format=ai --find "price product" | head -30
redocly tree stripe.yaml --format=ai --path="/v1/products" --operation=post | head -20
echo
redocly tree stripe.yaml --format=ai --operation=PostPrices | head -20
redocly tree stripe.yaml --format=ai --operation=GetCustomersCustomerPaymentMethods | head -20
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | head -20
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | python3 -c "
import sys,json,re
t=sys.stdin.read()
m=re.search(r'--- json\n(.*?)\nrefs:',t,re.S) or re.search(r'--- json\n(.*)',t,re.S)
d=json.loads(m.group(1))
for k,v in d.get('properties',{}).items():
print(k, '|', str(v.get('description',''))[:110].replace('\n',' '))
print('REQUIRED:', d.get('required'))
"
redocly tree stripe.yaml --format=ai --webhooks | grep -iE "trial|invoice.payment|subscription" | head -30
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | python3 -c "
print(list(d.get('properties',{}).keys()))
redocly tree stripe.yaml --format=ai --webhooks | head -5
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | python3 -c "
redocly tree stripe.yaml --format=ai --component=schemas --name=setup_intent | python3 -c "
for k in ['payments','confirmation_secret','status','billing_reason','next_payment_attempt']:
print('##',k, json.dumps(d['properties'][k])[:600]);print()
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_payment | python3 -c "
print(json.dumps(d.get('properties',{}).get('payment'))[:800])
print('keys:',list(d.get('properties',{}).keys()))
redocly tree stripe.yaml --format=ai --operation=GetInvoices | python3 -c "
for p in d.get('parameters',[]): print(p['in'],p['name'],json.dumps(p.get('schema'))[:120])
redocly tree stripe.yaml --format=ai --component=schemas --name=invoices_payments_invoice_payment_associated_payment | tail -5
redocly tree stripe.yaml --format=ai --operation=PostSetupIntents | python3 -c "
s=d['requestBody']['content']['application/x-www-form-urlencoded']['schema']
for k in ['customer','payment_method','usage','confirm','payment_method_types','off_session','automatic_payment_methods','attach_to_self','flow_directions']:
if k in s['properties']: print('##',k,json.dumps(s['properties'][k])[:300])
print('required:',s.get('required'))
redocly tree stripe.yaml --format=ai --find "retrieve subscription" | grep -i "^get /v1/subscriptions"
head -40 stripe.yaml | grep -nA4 -iE "servers|security|title|version"
grep -c "Idempotency-Key" stripe.yaml
redocly tree stripe.yaml --format=ai | head -20
redocly tree stripe.yaml --format=ai --find "setup_intents" | grep "^get\|^post" | head
redocly tree stripe.yaml --format=ai --find "pay invoice" | grep "^post /v1/invoices" | head
redocly tree stripe.yaml --format=ai --path="/v1/invoices/{invoice}/pay" --operation=post | python3 -c "
m=re.search(r'--- json\n(.*?)\nrefs:',t,re.S)
print('opId',d['operationId'])
print(list(s['properties'].keys()))
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
wc -l stripe.yaml && grep -n "^  /" stripe.yaml | head -100
sed -n '147301,147380p' stripe.yaml
awk 'NR>=147301 && NR<=148721' stripe.yaml | grep -n "    post:\|operationId:" | head
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                    [a-z_]*:" | head -80
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                  [a-z_]*:$"
awk 'NR>=147586 && NR<=148721' stripe.yaml | grep -n "^                [a-z_]*:"
A=147585; sed -n "$((A+393)),$((A+445))p;$((A+535)),$((A+560))p;$((A+1064)),$((A+1130))p" stripe.yaml
A=147585; sed -n "$((A+649)),$((A+700))p" stripe.yaml; echo ---; sed -n "$((A+1008+585)),$((A+1608+40))p" stripe.yaml | head -0
sed -n '127440,127520p' stripe.yaml
awk 'NR>=131359 && NR<=131911' stripe.yaml | grep -n "^                [a-z_]*:\|^              required:" ; echo "=== required block ==="; sed -n '131359,131911p' stripe.yaml | grep -n -A8 "^              required:"
B=131358; sed -n "$((B+417)),$((B+443))p;$((B+386)),$((B+417))p" stripe.yaml
grep -n "  /v1/customers/{customer}:" stripe.yaml
grep -n "^  /v1/customers/" stripe.yaml; echo ===; grep -n "^  /v1/payment_methods/\|^  /v1/setup_intents/" stripe.yaml
grep -n "{customer}\|{subscription}\|{intent}\|{payment_method}" stripe.yaml | head -40
sed -n '87677,87760p' stripe.yaml
C=85051; awk -v s=$C 'NR>=s && NR<=85622' stripe.yaml | grep -n "invoice_settings:" ; echo ===; sed -n '85350,85420p' stripe.yaml
sed -n "$((85051+401)),$((85051+440))p" stripe.yaml
sed -n '138252,138260p' stripe.yaml; echo "=== SI post params ==="; awk 'NR>=138252 && NR<=140077' stripe.yaml | grep -n "^                [a-z_]*:$" | head -40; echo "=== products required ==="; sed -n '132240,132685p' stripe.yaml | grep -n -A5 "^              required:"
D=138251; sed -n "$((D+1795)),$((D+1810))p" stripe.yaml; echo "=== sub response status enum ==="; grep -n "subscription_status\|      status:" stripe.yaml | head -5
grep -n "^    subscription:" stripe.yaml
awk 'NR>=53366 && NR<=54400' stripe.yaml | grep -n "^        [a-z_]*:" | head -60
sed -n "$((53365+384)),$((53365+400))p;$((53365+221)),$((53365+230))p" stripe.yaml
grep -n "confirmation_secret" stripe.yaml | head; echo ===; grep -n "^  /v1/webhook_endpoints" stripe.yaml; echo ===; grep -n "customer.subscription.trial_will_end\|invoice.payment_failed\|invoice.paid" stripe.yaml | head
grep -n "^  /v1/webhook_endpoints" stripe.yaml; sed -n '19170,19180p;21117,21140p' stripe.yaml; grep -c "payment_intent:" stripe.yaml
awk 'NR>=18800 && NR<=19800' stripe.yaml | grep -n "^        payment_intent:\|^        payments:\|^        status:"; echo "=== invoice schema start ==="; grep -n "^    invoice:" stripe.yaml
sed -n '19735,19750p' stripe.yaml
grep -in "idempotency" stripe.yaml | head -5; echo ===; grep -n "securitySchemes" -A 20 stripe.yaml | head -30
grep -n "securitySchemes" -A 25 stripe.yaml | head -35; echo "=== servers ==="; grep -n "^servers:" -A 4 stripe.yaml
sed -n '147850,147860p' stripe.yaml; grep -n "application/x-www-form-urlencoded" stripe.yaml | wc -l
sed -n '168832,169100p' stripe.yaml | grep -n "^                [a-z_]*:$\|^              required:" -A3 | head -40
awk 'NR>=168832 && NR<=169400' stripe.yaml | grep -n "enabled_events\|^              required:" -A4 | head -30
W=168831; sed -n "$((W+286)),$((W+300))p" stripe.yaml; grep -n "                    - customer.subscription.trial_will_end$\|                    - invoice.payment_failed$\|                    - invoice.paid$\|                    - customer.subscription.updated$\|                    - setup_intent.succeeded$" stripe.yaml | head
grep -n "                      - customer.subscription.trial_will_end$\|                      - invoice.payment_failed$\|                      - invoice.paid$\|                      - customer.subscription.updated$\|                      - customer.subscription.deleted$" stripe.yaml | head
awk 'NR>=169180 && NR<=169290' stripe.yaml | grep -n "trial_will_end\|subscription.updated\|invoice.paid\|invoice.payment_failed\|invoice.upcoming"
grep -n "'/v1/subscriptions/{subscription}':" stripe.yaml
grep -n "v1/subscriptions/{" stripe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree stripe.yaml --format=ai --find="subscription" | head -80
redocly tree stripe.yaml --format=ai --path="/v1/subscriptions" --operation=post | head -150
cd /Users/tora/bench-run/stripe-tree-help-local-opus-r2
redocly tree stripe.yaml --format=ai --path="/v1/prices" --operation=post | head -20
redocly tree stripe.yaml --format=ai --path="/v1/products" --operation=post | head -20
redocly tree stripe.yaml --format=ai --find="payment method" | head -30
redocly tree stripe.yaml --format=ai --find="setup intent" | head -20
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}/payment_methods" --operation=get | head -20
echo; echo "=== CUSTOMER UPDATE (invoice_settings) ==="
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | grep -o '"invoice_settings":{[^}]*}[^}]*}' | head -5
redocly tree stripe.yaml --format=ai --path="/v1/customers/{customer}" --operation=post | grep -o 'default_payment_method[^,]*' | head -3
echo; echo "=== setup_intents post params ==="
redocly tree stripe.yaml --format=ai --path="/v1/setup_intents" --operation=post | grep -oE '"(customer|payment_method|usage|confirm|automatic_payment_methods|attach_to_self|flow_directions|payment_method_types|return_url|use_stripe_sdk)":\{"description":"[^"]{0,180}' | head -20
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -oE '"(id|status|trial_end|trial_start|latest_invoice|pending_setup_intent|current_period_end|default_payment_method|items|cancel_at_period_end|billing_cycle_anchor)":' | sort -u
echo; echo "--- status enum ---"
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -oE '"status":\{"description":"[^"]{0,400}' | head -2
echo; echo "--- current_period_end present? ---"
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription | grep -c 'current_period_end'
grep -n "current_period_end" stripe.yaml | head -20
echo; echo "=== subscription_item schema props ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=subscription_item | grep -oE '"(id|current_period_end|current_period_start|price|quantity|subscription)":' | sort -u
awk 'NR>=53900 && NR<=53975' stripe.yaml | grep -nE "^    [a-z_]+:|current_period"
awk 'NR<=53961 && /^    [a-z_]+:$/ {last=NR": "$0} END{}' stripe.yaml
awk 'NR<=53961 && /^    [a-z_0-9]+:$/ {last=NR": "$0} END{print last}' stripe.yaml
awk 'NR>=53367 && NR<=53940' stripe.yaml | grep -n -A14 "^        status:" | head -25
echo; echo "=== relevant webhooks ==="
redocly tree stripe.yaml --format=ai --webhooks | grep -iE "trial|invoice\.(paid|payment_failed|payment_action_required|upcoming)|subscription\.(created|updated|deleted)|setup_intent" | head -25
redocly tree stripe.yaml --format=ai --webhooks | head -20
redocly tree stripe.yaml --format=ai --find="events" | grep -E "^(get|post) " | head -10
redocly tree stripe.yaml --format=ai --path="/v1/webhook_endpoints" --operation=post | grep -oE "(customer\.subscription\.[a-z_]+|invoice\.[a-z_]+|setup_intent\.[a-z_]+)" | sort -u | head -40
redocly tree stripe.yaml --format=ai --path="/v1/webhook_endpoints" --operation=post | grep -oE '"required":\[[^]]*\]' | head -3
echo; echo "=== Idempotency-Key documented? ==="
grep -c -i "idempotency" stripe.yaml
echo; echo "=== servers ==="
grep -n -A3 "^servers:" stripe.yaml | head -6
echo; echo "=== payment_method.allow_redisplay ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=payment_method | grep -oE '"allow_redisplay":\{"description":"[^"]{0,200}' | head -2
redocly tree stripe.yaml --format=ai --path="/v1/setup_intents" --operation=post | grep -oE '"usage":\{"description":"[^"]*","enum":\[[^]]*\]|"usage":\{[^}]*enum[^]]*\]' | head -2
echo; echo "=== setup_intent schema key fields ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=setup_intent | grep -oE '"(client_secret|status|payment_method|next_action|usage)":' | sort -u
echo; echo "=== setup_intent.status desc ==="
awk 'NR>=50488 && NR<=51000' stripe.yaml | grep -A6 "^        status:" | head -10
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"(payment_intent|payments|status|amount_due|confirmation_secret)":' | sort -u
echo; echo "=== x-expandableFields on invoice (sample) ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"x-expandableFields":\[[^]]*\]' | head -1
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice | grep -oE '"payments":\{[^{]*\{[^{]*\{[^}]*\}' | head -2
echo; echo "=== invoice_payment schema ==="
redocly tree stripe.yaml --format=ai --component=schemas --name=invoice_payment | grep -oE '"(payment|status|is_default|amount_paid)":' | sort -u
echo; echo "=== does /v1/invoices/{invoice}/pay exist? ==="
redocly tree stripe.yaml --format=ai --find="pay invoice" | grep -E "^post" | head -5
redocly tree stripe.yaml --format=ai --path="/v1/invoices/{invoice}/pay" --operation=post | grep -oE '"(off_session|payment_method|source|paid_out_of_band|forgive|mandate)":\{"description":"[^"]{0,120}' | head -8
```

{% /tab %}
{% /tabs %}

Both sides pass both runs, and the index costs 48% more context while still billing 20% less.
Stripe's schemas are enormous, so every card the index returns is heavy, while the control greps its way to precise line ranges; the cache prices the index's fewer, larger requests lower anyway.

{% /tab %}

{% tab label="DigitalOcean · 2,909 files" %}

**Task:** one server in its own private network, an extra storage volume attached, and a firewall that lets in only SSH and HTTPS.
Expected: `POST /v2/vpcs` → `POST /v2/droplets` → `POST /v2/volumes` → the volume attach action → `POST /v2/firewalls`.
Traps: the droplet joins the VPC by `vpc_uuid` in its body, the attach is a separate `/v2/volumes/{volume_id}/actions` call, and the firewall still has to name `droplet_ids`.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
We're standing up a small web service: one server in its own private network, an extra
storage volume attached to it, and a firewall that lets in only SSH and HTTPS. Nothing
is set up yet. Work out what our deploy script has to call, in order.

API description: digitalocean/DigitalOcean-public.v2.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Run            |     no tree |        tree |
| -------------- | ----------: | ----------: |
| Opus 5 · run 1 |  17,443 / 9 | 28,664 / 16 |
| Opus 5 · run 2 | 19,626 / 14 | 26,544 / 26 |
| median         | 19,626 / 14 | 28,664 / 26 |

Difference on the medians: +46% context.

What those runs were billed:

| Run            | no tree |  tree |
| -------------- | ------: | ----: |
| Opus 5 · run 1 |   $0.63 | $0.96 |
| Opus 5 · run 2 |   $0.65 | $0.95 |
| median         |   $0.65 | $0.96 |

Difference on the medians: +48%.

All four runs produced a flow that passes the check.
A run works when its flow contains `POST /v2/vpcs`, `POST /v2/droplets` with `vpc_uuid`, `POST /v2/volumes`, the attach action with `droplet_id`, and `POST /v2/firewalls` with `inbound_rules` and `droplet_ids`, under `bearer_auth`.

What each run ran:

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/(vpcs|droplets|volumes|firewalls|actions|sizes|images|regions)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
sed -n '2453,2530p' DigitalOcean-public.v2.yaml && ls resources | head -50
cat vpcs/vpcs_create.yml && echo ==== && cat volumes/volumes_create.yml && echo ==== && cat volumes/volumeActions_post_byId.yml && echo ==== && cat firewalls/firewalls_create.yml
for f in vpcs/models/vpc.yml volumes/volumes_create.yml volumes/volumeActions_post_byId.yml firewalls/firewalls_create.yml; do echo "=== $f"; cat $f; done
for f in volumes/models/volumes_ext4.yml volumes/models/volume_action_post_attach.yml volumes/models/volume_action_post_base.yml droplets/models/droplet_create.yml; do echo "=== $f"; cat $f 2>/dev/null; done; ls volumes/models droplets/models firewalls/models
for f in droplets/models/droplet_single_create.yml firewalls/models/firewall.yml firewalls/models/firewall_rule.yml droplets/droplets_create.yml firewalls/responses/create_firewall_response.yml volumes/responses/volumeAction.yml; do echo "=== $f"; cat $f; done
sed -n '1,80p' droplets/responses/droplet_create.yml; echo "=== example"; sed -n '/droplet_create_response/,/^[a-z_]*:$/p' droplets/examples.yml | head -80
cat shared/models/action_link.yml; echo "=== droplet actions get"; cat resources/droplets/dropletActions_get.yml 2>/dev/null | head -30; ls resources/droplets | grep -i action
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree --help | head -60; ls
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -50
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml | head -60
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create"|head -40; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable"|head -40; echo ===; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/responses/existing_vpc.yml"|head -40
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for p in 'digitalocean/resources/vpcs/models/vpc.yml#/vpc_create' 'digitalocean/resources/vpcs/models/vpc.yml#/vpc_updatable' 'digitalocean/resources/vpcs/responses/existing_vpc.yml'; do echo "### $p"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="$p" --with-deps|head -30; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; sed -n 1,120p vpcs/models/vpc.yml; echo "=== existing_vpc"; cat vpcs/responses/existing_vpc.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for f in "volume" "firewall" "ssh key"; do echo "### $f"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="$f"|head -30; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for op in droplets_create volumes_create volumeActions_post_byId firewalls_create; do echo "###### $op"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=$op --with-deps|head -40; done
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== droplet_single_create"; cat droplets/models/droplet_single_create.yml; echo "=== droplet_create.yml(model)"; sed -n 1,200p droplets/models/droplet_create.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== volumes_ext4"; cat volumes/models/volumes_ext4.yml; echo "=== volume_base"; cat volumes/models/volume_base.yml; echo "=== attributes"; sed -n 1,80p volumes/models/attributes.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; echo "=== attach"; cat volumes/models/volume_action_post_attach.yml; echo "=== base"; cat volumes/models/volume_action_post_base.yml; echo "=== volumeAction resp"; cat volumes/responses/volumeAction.yml; echo "=== firewall model"; sed -n 1,200p firewalls/models/firewall.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1/digitalocean/resources; sed -n 1,140p firewalls/models/firewall_rule.yml
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; cat digitalocean/resources/droplets/responses/droplet_create.yml; echo "=== firewall resp"; cat digitalocean/resources/firewalls/responses/create_firewall_response.yml; echo "=== action_link"; cat digitalocean/shared/models/action_link.yml; echo; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find="action status"|head -20
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; for op in actions_get droplets_get volumeActions_get sshKeys_create; do echo "##### $op"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=$op|sed -n 1,6p; done; echo "=== ssh model"; cat digitalocean/resources/ssh_keys/models/sshKeys.yml 2>/dev/null | head -50
cd /Users/tora/bench-run/digitalocean-tree-help-local-opus-r1; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai|head -20; echo "=== action model"; sed -n 1,60p digitalocean/resources/actions/models/action.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls digitalocean/ && wc -l digitalocean/DigitalOcean-public.v2.yaml
grep -n "^  /v2/(vpcs|droplets|volumes|firewalls|actions|account/keys)[^:]*:" digitalocean/DigitalOcean-public.v2.yaml
cd digitalocean; sed -n '2453,2500p;1301,1315p;1410,1420p;2493,2500p;764,770p' DigitalOcean-public.v2.yaml
cd digitalocean/resources; ls; ls vpcs volumes firewalls droplets 2>/dev/null
cd digitalocean/resources; cat vpcs/vpcs_create.yml; echo ===; ls vpcs/models; cat vpcs/models/*.yml 2>/dev/null | head -80
cd digitalocean/resources; cat volumes/volumes_create.yml; echo ===MODELS; ls volumes/models; echo ===ATTACH; cat volumes/volumeActions_post_byId.yml
cd digitalocean/resources; cat vpcs/models/vpc.yml; echo "--- attributes:"; ls vpcs/attributes; cat vpcs/responses/existing_vpc.yml
cd digitalocean/resources; cat volumes/models/volumes_ext4.yml; echo "--- ATTACH BYID"; cat volumes/volumeActions_post_byId.yml; echo "--- MODELS"; ls volumes/models
cd digitalocean/resources; cat droplets/droplets_create.yml | head -60; echo "--- MODELS"; ls droplets/models; echo "--- single create model"; sed -n '1,200p' droplets/models/droplet_single_create.yml 2>/dev/null
cd digitalocean/resources; cat firewalls/firewalls_create.yml; echo "--- MODELS"; ls firewalls/models; cat firewalls/models/*.yml | head -160
cd digitalocean/resources; cat droplets/models/droplet_create.yml
cd digitalocean/resources; cat droplets/responses/droplet_create.yml; echo "--- ACTIONS GET"; cat actions/actions_get.yml; echo "--- ACTION MODEL"; cat actions/models/*.yml 2>/dev/null | head -70
cd digitalocean/resources; sed -n '740,760p' ../DigitalOcean-public.v2.yaml; echo "--- SSHKEYS"; ls ssh_zzz 2>/dev/null; cat ssh_keys/sshKeys_list.yml | head -25; echo "--- KEY MODEL"; cat ssh_keys/models/*.yml | head -40
cd digitalocean/resources; grep -n -A12 "status:" droplets/models/droplet.yml | head -40; echo "--- VOLUME BASE READ"; cat volumes/models/volume_base_read.yml | head -40; echo "--- VOLACTION RESP"; cat volumes/responses/volumeAction.yml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree --help | head -80
ls && ls digitalocean | head
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "vpc" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "firewall" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "volume" | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag=Droplets | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=vpcs_create --with-deps | head -120
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumes_create --with-deps | head -160
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=droplets_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=firewalls_create --with-deps | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/droplets/models/droplet_single_create.yml --with-deps | head -60; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/vpcs/models/vpc.yml --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=digitalocean/resources/volumes/models/volumes_ext4.yml --with-deps | head -60; echo ====; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
for f in digitalocean/resources/droplets/models/droplet_single_create.yml digitalocean/resources/vpcs/models/vpc.yml; do echo "=== $f"; redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --file=$f | head -40; done
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --operation=volumeActions_post_byId --with-deps | head -40
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/droplets/models/droplet_single_create.yml" | head -60
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --pointer="digitalocean/resources/vpcs/models/vpc.yml#/vpc_create" | head -40
cat droplets/models/droplet_single_create.yml && echo "=== droplet_create" && cat droplets/models/droplet_create.yml
cat vpcs/models/vpc.yml && echo "=== volumes_ext4" && cat volumes/models/volumes_ext4.yml && echo "=== volume_base" && cat volumes/models/volume_base.yml
cat firewalls/models/firewall.yml && echo "=== rule" && cat firewalls/models/firewall_rule.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --find "actions" | head -20; echo "=== droplet_create response"; cat droplets/responses/droplet_create.yml; echo "=== action_link"; cat ../shared/models/action_link.yml
cat volumes/models/volume_action_post_attach.yml; echo "=== base"; cat volumes/models/volume_action_post_base.yml; echo "=== resp"; cat volumes/responses/volumeAction.yml
redocly tree digitalocean/DigitalOcean-public.v2.yaml --format=ai --tag=Actions | head -20
cat actions/models/action.yml | head -50; echo "=== fw resp"; cat firewalls/responses/create_firewall_response.yml; echo "=== vpc resp"; cat vpcs/responses/existing_vpc.yml
head -40 actions/models/action.yml; echo "=== fw resp"; head -30 firewalls/responses/create_firewall_response.yml; echo "=== vpc resp"; head -30 vpcs/responses/existing_vpc.yml
head -25 volumes/responses/volume.yml
```

{% /tab %}
{% /tabs %}

Both sides pass both runs, and this is the one description where the index loses outright: 46% more context at 48% more cost.
The reason is the description itself — 2,909 files, one operation each, named by what they do. That layout already is an index, and `cat vpcs/vpcs_create.yml` is cheaper than any card.

{% /tab %}

{% tab label="Cafe API · 41 KB" %}

**Task:** a customer app that browses the menu, orders a coffee, and follows the order until it is ready.
Expected: `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`.
Trap: ordering requires an OAuth2 token with the `orders:write` scope, minted by a call the task never mentions.

{% tabs %}
{% tab label="Prompt: no tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% tab label="Prompt: tree" %}

```text
I'm building a mobile app for a cafe: the customer browses the menu, orders a coffee,
and follows that order until it's ready. Work out what the app has to call, end to end.

API description: cafe.yaml

The Redocly CLI is installed and its `tree` command can search the description for you.
Start with `redocly tree --help` to see what it can select, then work with `--format=ai`:
redocly tree cafe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Run            |    no tree |        tree |
| -------------- | ---------: | ----------: |
| Opus 5 · run 1 | 16,769 / 1 | 13,882 / 10 |
| Opus 5 · run 2 | 16,769 / 1 | 15,375 / 11 |
| median         | 16,769 / 1 | 15,375 / 11 |

Difference on the medians: −8% context.

What those runs were billed:

| Run            | no tree |  tree |
| -------------- | ------: | ----: |
| Opus 5 · run 1 |   $0.42 | $0.60 |
| Opus 5 · run 2 |   $0.43 | $0.65 |
| median         |   $0.43 | $0.65 |

Difference on the medians: +50%.

All four runs produced a flow that passes the check.
A run works when its flow contains `POST /oauth2/token`, `GET /menu`, `POST /orders` and `GET /orders/{orderId}`, all against `api.cafe.redocly.com`.

What each run ran:

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
ls -la && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps
redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps; echo "=== GET ORDER ==="; redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps; echo "=== SEC ==="; redocly tree cafe.yaml --format=ai --component=securitySchemes; echo "=== WEBHOOKS ==="; redocly tree cafe.yaml --format=ai --webhooks
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "=== ORDER SCHEMA ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItem --with-deps; echo "=== PHOTO ==="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto --with-deps; echo "=== ROOT ==="; redocly tree cafe.yaml --format=ai | head -40
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId}; echo "=== PhotoSize ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize --with-deps; echo "=== MenuBaseItem ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --operation=updateOrder --with-deps; echo "=== WEBHOOK ==="; redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps
cd /Users/tora/bench-run/cafe-tree-help-local-opus-r1; redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject; echo "=== Limit ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit; echo "=== OrderId ==="; redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId; echo "=== MenuItemList ==="; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuItemList
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
ls && redocly tree --help
redocly tree cafe.yaml --format=ai --operations
redocly tree cafe.yaml --format=ai --operation=listMenuItems --with-deps | head -120
redocly tree cafe.yaml --format=ai --operation=createOrder --with-deps | head -80; echo "=========="; redocly tree cafe.yaml --format=ai --operation=getOrderById --with-deps | head -60
redocly tree cafe.yaml --format=ai --webhooks; echo "===REG==="; redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps | head -60; echo "===SEC==="; redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "===WH==="; redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post --with-deps | head -40
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps | head -60
for n in MenuItem Beverage MenuBaseItem MenuItemList Page; do redocly tree cafe.yaml --format=ai --component=schemas --name=$n | head -8; echo "---"; done
redocly tree cafe.yaml --format=ai --component=schemas --name=RegisterClientObject | head -8; echo "===PHOTO==="; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto | head -8; echo "===UPD==="; redocly tree cafe.yaml --format=ai --operation=updateOrder | head -8; echo "===LOI==="; redocly tree cafe.yaml --format=ai --operation=listOrderItems | head -8
redocly tree cafe.yaml --format=ai | head -30; echo "===OI==="; redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem|head -6; echo "===PS==="; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize|head -6
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} | head -20; echo "===FILTER==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Filter|head -6; echo "===LIMIT==="; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit|head -6; echo "===ORDERID==="; redocly tree cafe.yaml --format=ai --component=parameters --name=OrderId|head -6
```

{% /tab %}
{% /tabs %}

Both sides pass both runs; at 41 KB the control reads the file once and the index still ends 8% cheaper in context, though half again pricier in dollars.

{% /tab %}

{% /tabs %}

## The grid in one view

| Description  | no tree ctx |    tree ctx | Δ ctx | no tree $ | tree $ |  Δ $ |
| ------------ | ----------: | ----------: | ----: | --------: | -----: | ---: |
| GitHub REST  | 18,798 / 16 | 15,630 / 10 |  −17% |     $0.69 |  $0.62 | −10% |
| Billing API  | 45,744 / 51 | 40,281 / 26 |  −12% |     $2.38 |  $1.14 | −52% |
| Stripe       | 24,339 / 36 | 35,908 / 18 |  +48% |     $1.54 |  $1.22 | −20% |
| DigitalOcean | 19,626 / 14 | 28,664 / 26 |  +46% |     $0.65 |  $0.96 | +48% |
| Cafe API     |  16,769 / 1 | 15,375 / 11 |   −8% |     $0.43 |  $0.65 | +50% |

All twenty runs produced a flow that passes the check: Opus 5 solves every one of these tasks with or without the index.
What the index changes is the price, and the sign of the change follows the shape of the description:
on the single-file descriptions that defeat search — the billing API, GitHub — it is 12% to 17% less context and up to half the cost;
on Stripe it costs 48% more context yet 20% fewer dollars, because its giant schemas make every card heavy while the cache prices fewer, larger requests lower;
and on DigitalOcean the index loses outright, because a description already split into 2,909 single-operation files named by what they do _is_ an index, and `cat vpcs/vpcs_create.yml` beats any card.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in a directory holding nothing but the description, outside any repository; the tree runs call a local build of PR #3005 at `0203f1081`.
Each cell is two runs and the tables show both, with the median as the summary line — a pilot, not the full grid, so read every difference as a direction rather than a number.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`: a turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, and the table gives the last turn's minus the first turn's.

**cost** — `total_cost_usd` as the run reports it. It moves with the prompt cache, so read it for shape.

**working** — the answer is parsed for the calls it proposes and compared with the flow the description requires: every required call, the host, the required body fields, the authentication. The check accepts any placeholder spelling — `{volume_id}`, `$VOLUME_ID`, a URL carried from an earlier response — and reports only what is nowhere in the answer.
