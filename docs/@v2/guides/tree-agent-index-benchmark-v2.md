# Whether the flow an agent produces would actually run

The [first benchmark](./tree-agent-index-benchmark.md) asked an agent to name the calls a task needs, and measured what that cost.
This one asks for a working flow — the order of calls, what each one needs, what carries over — and then checks the answer against the description.
That check is the point: a run that skips the token call is cheap and useless, and the first benchmark could not tell it apart from a good one.

Three descriptions, four models, two conditions, three runs each — 72 runs:

- **no tree** — the task and the path to the file. Neither `tree` nor Redocly is named.
- **tree** — the same task plus one line: the CLI is installed, and `tree --format=ai <flags>` makes searching the description easier. No flags are listed and no documentation is linked.

Each run is measured by the context it added to its own session, with tool calls after the slash, by what it was billed, and by whether its flow passes the check.
How all four are counted is in [How this was measured](#how-this-was-measured) at the end.

Every context and cost cell is the median of the runs in it whose flow works.
A cell marked ❌ is one where none of the three did: its numbers are the median of all three and say what an answer that does not work cost, not what the task costs.
The difference column always divides one side by the other, so where a ❌ meets an unmarked cell it measures the gap between a broken answer and a working one, not a saving.

Descriptions: GitHub REST (`api.github.com.yaml` from [`github/rest-api-description`](https://github.com/github/rest-api-description), 10.0 MB),
a billing API (Rebilly, 1.3 MB), the Cafe demo API (41 KB).

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

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree github-api.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |       no tree |       tree | Difference |
| --------- | ------------: | ---------: | ---------: |
| Sonnet 5  |   12,528 / 14 | 12,915 / 7 |        +3% |
| Opus 5    |   16,462 / 13 | 16,284 / 9 |        −1% |
| Fable 5   |   14,815 / 10 | 11,088 / 9 |       −25% |
| Haiku 4.5 | 15,505 / 8 ❌ |  8,565 / 6 |       −45% |

What those runs were billed:

| Model     |  no tree |  tree | Difference |
| --------- | -------: | ----: | ---------: |
| Sonnet 5  |    $0.39 | $0.30 |       −23% |
| Opus 5    |    $0.72 | $0.61 |       −15% |
| Fable 5   |    $1.00 | $0.80 |       −20% |
| Haiku 4.5 | $0.10 ❌ | $0.08 |       −20% |

Whether each run produced a flow that would run:

| Run               | no tree      | tree         |
| ----------------- | ------------ | ------------ |
| Sonnet 5 · run 1  | works        | works        |
| Sonnet 5 · run 2  | works        | works        |
| Sonnet 5 · run 3  | works        | works        |
| Opus 5 · run 1    | works        | works        |
| Opus 5 · run 2    | works        | works        |
| Opus 5 · run 3    | works        | works        |
| Fable 5 · run 1   | works        | works        |
| Fable 5 · run 2   | works        | works        |
| Fable 5 · run 3   | works        | works        |
| Haiku 4.5 · run 1 | no app token | no app token |
| Haiku 4.5 · run 2 | no app token | no app token |
| Haiku 4.5 · run 3 | no app token | works        |

A run works when its flow contains `POST /app/installations/{id}/access_tokens`, `POST /releases`, the asset upload and `DELETE /releases/assets/{asset_id}`, and sends the upload to `uploads.github.com`.
The upload may be addressed either by path or through the `upload_url` the release returns; both count.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
wc -l github-api.yaml
grep "operationId: .*[Rr]elease" github-api.yaml
grep "operationId: .*[Ii]nstallation" github-api.yaml
grep -n "operationId:.*[Rr]elease" github-api.yaml
grep -n "operationId:.*[Ii]nstallation" github-api.yaml
sed -n '3420,3510p' github-api.yaml
sed -n '53281,53366p' github-api.yaml
sed -n '53365,53445p' github-api.yaml
sed -n '53909,53969p' github-api.yaml
sed -n '53524,53554p' github-api.yaml
grep -n "installation-token:|^    release:$|^    release-asset:$" github-api.yaml
sed -n '87440,87480p' github-api.yaml
sed -n '90866,90996p' github-api.yaml
grep -n "^    installation-id:|^    release-id:|^    asset-id:" github-api.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --search "release" | head -100
redocly tree github-api.yaml --format=ai --find "release" | head -150
redocly tree github-api.yaml --format=ai --find "upload asset" | head -60
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post --with-deps | head -250
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps | head -150
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete --with-deps | head -100
redocly tree github-api.yaml --format=ai --find "installation access token" | head -40
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps | head -100
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "operationId: repos/(create-release|upload-release-asset|delete-release-asset|get-release)" github-api.yaml
grep -n "operationId: apps/create-installation-access-token" github-api.yaml
grep -n "operationId: repos/(create-release|upload-release-asset|delete-release-asset|get-release)\\b" github-api.yaml
sed -n '3380,3500p' github-api.yaml
grep -n "^    installation-token:" -A 30 github-api.yaml | head -40
sed -n '53280,53460p' github-api.yaml
sed -n '53500,53700p' github-api.yaml
sed -n '53860,53960p' github-api.yaml
grep -n "^    release:$" github-api.yaml
sed -n '90926,90996p' github-api.yaml
grep -n "^    release-asset:$" github-api.yaml
sed -n '90866,90926p' github-api.yaml
grep -n "securitySchemes:|app_manifest_jwt|bearerFormat|scheme: bearer\" -A3" github-api.yaml | head -40
grep -n "securitySchemes:" github-api.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --search "release" | head -100
redocly tree github-api.yaml --format=ai --find "release" | head -150
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -50
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post --with-deps | head -300
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps | head -200
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete --with-deps | head -100
redocly tree github-api.yaml --format=ai --find "create an installation access token" | head -50
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps | head -150
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
wc -l github-api.yaml
grep -n "operationId: (repos/create-release|repos/upload-release-asset|repos/delete-release-asset|apps/create-installation-access-token|repos/get-release)" github-api.yaml
sed -n '3380,3480p' github-api.yaml
grep -n "installation-token:" -A 30 github-api.yaml | head -40
sed -n '53300,53450p' github-api.yaml
sed -n '53490,53550p' github-api.yaml
sed -n '53870,53970p' github-api.yaml
grep -n "^    release-asset:" -A 5 github-api.yaml; echo ---; grep -n "release-asset-response-for-successful-upload:" -A 25 github-api.yaml | head -30
grep -n "^components:\|examples/release:\|  release:$" github-api.yaml | head -20
sed -n '252456,252486p' github-api.yaml
grep -n "asset-id:\|release-id:\|installation-id:" -A 6 github-api.yaml | grep -A6 "parameters" | head -40
grep -n "^    asset-id:\|^    release-id:\|^    installation-id:" -A 8 github-api.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --search "app" | head -100
redocly tree github-api.yaml --format=ai --find "release" | head -150
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -60
redocly tree github-api.yaml --format=ai --find "installation access token" | head -60
redocly tree github-api.yaml --format=ai --path "/app/installations/{installation_id}/access_tokens" --operation post --with-deps | head -200
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases" --operation post | head -80
echo "=====UPLOAD====="
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post | head -80
echo "=====DELETE ASSET====="
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation delete | head -60
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la  && wc -l github-api.yaml
grep -n "operationId: apps/create-installation-access-token\|operationId: repos/create-release\|operationId: repos/upload-release-asset\|operationId: repos/delete-release-asset\|operationId: repos/get-release\|operationId: apps/get-authenticated\|operationId: apps/get-repo-installation\|operationId: repos/update-release" github-api.yaml
sed -n '3400,3520p' github-api.yaml
sed -n '45790,45870p' github-api.yaml && echo "=====CREATE RELEASE" && sed -n '53300,53445p' github-api.yaml
sed -n '53500,53560p' github-api.yaml && echo "=====UPLOAD" && sed -n '53880,53990p' github-api.yaml
sed -n '53870,53882p' github-api.yaml && echo "===SERVERS" && sed -n '1,30p' github-api.yaml && echo "===PERMS" && grep -n "  app-permissions:" github-api.yaml
grep -n "^servers:" -A6 github-api.yaml | head -20 && echo "===PATHKEY" && awk 'NR>53780 && NR<53880 && /^  .\/repos/' github-api.yaml && echo "===CONTENTS PERM" && sed -n '86225,86260p' github-api.yaml
awk 'NR>86225 && NR<87200 && /^        (contents|workflows):/{print NR": "$0}' github-api.yaml && echo "===INSTALL TOKEN" && grep -n "    installation-token:" github-api.yaml
sed -n '87440,87490p' github-api.yaml && echo "===RELEASE ASSET SCHEMA" && grep -n "^    release-asset:" github-api.yaml
sed -n '90866,90920p' github-api.yaml && echo "===RELEASE" && grep -n "^    release:" github-api.yaml
sed -n '90926,90975p' github-api.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --help | head -60
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -20; echo ---; redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
for spec in "--path=/app/installations/{installation_id}/access_tokens --operation=post" "--path=/repos/{owner}/{repo}/releases --operation=post" "--path=/repos/{owner}/{repo}/releases/{release_id}/assets --operation=post" "--path=/repos/{owner}/{repo}/releases/assets/{asset_id} --operation=delete"; do echo "=== $spec"; redocly tree github-api.yaml --format=ai $spec | head -70; done
redocly tree github-api.yaml --format=ai --operation=apps/create-installation-access-token | head -60
redocly tree github-api.yaml --format=ai --operation=repos/create-release | head -40
redocly tree github-api.yaml --format=ai --operation=repos/upload-release-asset | head -40
redocly tree github-api.yaml --format=ai --operation=repos/delete-release-asset | head -20; echo "=== TOKEN SCHEMA"; redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token | head -20
redocly tree github-api.yaml --format=ai --find "repository installation app" | head -12; echo "=== ASSET"; redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -6; echo "=== RELEASE"; redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -6; echo "=== ASSETID"; redocly tree github-api.yaml --format=ai --component=parameters --name=asset-id | head -6
redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions | grep -o '"contents":{[^}]*}' | head -3; redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions | grep -o '"workflows":{[^}]*}' | head -3; echo "=== UPDATE RELEASE"; redocly tree github-api.yaml --format=ai --operation=repos/update-release | grep -o '"requestBody".*"responses"' | head -c 2000
redocly tree github-api.yaml --format=ai --operation=repos/check-immutable-releases | head -8; echo "=== SCHEMA"; redocly tree github-api.yaml --format=ai --component=schemas --name=check-immutable-releases | head -5
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la  && wc -l github-api.yaml
grep -n "^  /.*releases.*:|^  /.*installation.*:|^  /app.*:" github-api.yaml
grep -n "^paths:" github-api.yaml && grep -nE "^ +\"?/[a-z{]" github-api.yaml | head -20
sed -n '118,135p' github-api.yaml
grep -nE "^  '/[^']*releases[^']*':" github-api.yaml; echo ---; grep -nE "^  '/(app|installation)[^']*':" github-api.yaml; echo ---; grep -nE "^  '/[^']*assets[^']*':" github-api.yaml
sed -n '3419,3500p' github-api.yaml
sed -n '53843,53960p' github-api.yaml
sed -n '53272,53431p' github-api.yaml
sed -n '53431,53545p' github-api.yaml
sed -n '1,20p' github-api.yaml; echo === ; grep -nE "^  '/repos/\{owner\}/\{repo\}/installation'" github-api.yaml; echo ===; grep -n "installation-token:" github-api.yaml | head; echo ===; grep -n "    release-asset:" github-api.yaml | head
grep -n "^servers:" -A6 github-api.yaml; grep -nE "^  '/repos/\{owner\}/\{repo\}/installation':" github-api.yaml; grep -n "^    installation-token:" -A 25 github-api.yaml | head -40
sed -n '45809,45850p' github-api.yaml; echo ===UPLOADURL; grep -n "        upload_url:" -A4 github-api.yaml | sed -n '1,30p'
awk 'NR>=87470 && NR<=87475' github-api.yaml; echo "=== release schema:"; grep -n "^    release:" -A 40 github-api.yaml | grep -nE "upload_url|assets_url|^\s*[0-9]+-        (id|url|tag_name|html_url|draft):" | head -20; echo "=== workflows perm:"; grep -n "        workflows:" -A 8 github-api.yaml | head -20
grep -n "^    release-asset:" -A 30 github-api.yaml | head -35; echo "=== asset-id param:"; grep -n "^    asset-id:" -A 8 github-api.yaml
sed -n '53685,53700p' github-api.yaml; grep -n "^    release-id:" -A 8 github-api.yaml
awk 'NR>=53685 && NR<=53843 && /^    (get|patch|delete|post|put):/ {print NR": "$0}' github-api.yaml; awk 'NR>=53730 && NR<=53843 && /operationId|^                (draft|make_latest|tag_name):/ {print NR": "$0}' github-api.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --grep "releases" | head -80
redocly tree github-api.yaml --format=ai --find "release" | head -80
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -30
echo "=== create-release ==="
redocly tree github-api.yaml --format=ai --operation repos/create-release --with-deps | head -120
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" --operation post --with-deps | head -60
echo "=== DELETE ASSET ==="
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset --with-deps | head -40
redocly tree github-api.yaml --format=ai --operation repos/check-immutable-releases --with-deps | head -30
echo "=== APP AUTH ==="
redocly tree github-api.yaml --format=ai --find "installation access token" | head -20
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token --with-deps | head -25
echo "=== UPDATE RELEASE ==="
redocly tree github-api.yaml --format=ai --operation repos/update-release | head -25
echo "=== IMMUTABLE SCHEMA ==="
redocly tree github-api.yaml --format=ai --component schemas --name check-immutable-releases --with-deps | head -30
redocly tree github-api.yaml --format=ai --component schemas --name release | grep -o '"immutable":{[^}]*}'
redocly tree github-api.yaml --format=ai --component schemas --name release-asset | grep -o '"digest":{[^}]*}\|"state":{[^}]*}'
redocly tree github-api.yaml --format=ai --operation repos/enable-immutable-releases | head -8
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/releases/{release_id}/assets" | head -10
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l github-api.yaml; grep -n "^  /" github-api.yaml | head -100
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; grep -n "releases" github-api.yaml | grep -i "  \"/\|^ */" | head -50; echo ---; grep -n "^\s*\"/repos/{owner}/{repo}/releases" github-api.yaml | head
grep -n "releases" github-api.yaml | head -40
grep -n "operationId: repos/\(create-release\|upload-release-asset\|delete-release-asset\|get-release\|list-release-assets\|update-release\|delete-release\)" github-api.yaml; echo "=== app auth ==="; grep -n "operationId: apps/create-installation-access-token" github-api.yaml
sed -n '3400,3520p' github-api.yaml
grep -n "operationId: apps/get-repo-installation" -A2 -B25 github-api.yaml | head -40
sed -n '53280,53440p' github-api.yaml
sed -n '53500,53560p;53880,54010p' github-api.yaml
grep -n "immutable" github-api.yaml | grep -v "^2[78]" | head -30
sed -n '90890,91000p' github-api.yaml; echo "=== asset schema ==="; grep -n "    release-asset:" -A 60 github-api.yaml | head -70
sed -n '53725,53830p' github-api.yaml
sed -n '45238,45275p' github-api.yaml; echo ===; grep -n "    check-immutable-releases:" -A 25 github-api.yaml
grep -n "    app-permissions:" -A 40 github-api.yaml | grep -n "contents\|workflows\|metadata" ; grep -n "^        workflows:" -A 8 github-api.yaml | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
redocly tree github-api.yaml --format=ai | head -50
redocly tree github-api.yaml --format=ai --find="release asset" | head -60
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases" --operation=post | head -80; echo ===; redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post | head -80
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --operation=post | head -60
redocly tree github-api.yaml --format=ai --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --operation=delete | head -40
redocly tree github-api.yaml --format=ai --find="installation access token" | head -30
redocly tree github-api.yaml --format=ai --path="/app/installations/{installation_id}/access_tokens" --operation=post | head -40
redocly tree github-api.yaml --format=ai --component=schemas --name=installation-token | head -20; redocly tree github-api.yaml --format=ai --component=schemas --name=release-asset | head -20
redocly tree github-api.yaml --format=ai --component=schemas --name=release | head -6; redocly tree github-api.yaml --format=ai --component=schemas --name=app-permissions | grep -o '"\(contents\|workflows\)":{[^}]*}' | head
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Fable 5 · run 1 · no tree" %}

```bash
ls -la github-api.yaml && wc -l github-api.yaml
grep "^  /app/installations/\\{installation_id\\}/access_tokens:|^  /repos/\\{owner\\}/\\{repo\\}/releases:|^  /repos/\\{owner\\}/\\{repo\\}/releases/assets/\\{asset_id\\}:|^  /repos/\\{owner\\}/\\{repo\\}/releases/\\{release_id\\}/assets:" github-api.yaml
grep "access_tokens|releases" github-api.yaml | head -40
grep "'/repos/\\{owner\\}/\\{repo\\}/releases" github-api.yaml
sed -n '3419,3559p' github-api.yaml
sed -n '53272,53432p' github-api.yaml
sed -n '53431,53546p' github-api.yaml
sed -n '53843,53961p' github-api.yaml
grep "    installation-token:" github-api.yaml
grep "upload_url" github-api.yaml | head -15
```

{% /tab %}
{% tab label="Fable 5 · run 1 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --search releases | head -60
redocly tree github-api.yaml --format=ai --search "access_tokens" | head -30
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "installation access token" | head -40
redocly tree github-api.yaml --format=ai --find "upload asset" | head -20
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token | head -60
redocly tree github-api.yaml --format=ai --operation repos/create-release | head -40
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset | head -40
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --path "/repos/{owner}/{repo}/installation" | head -15; redocly tree github-api.yaml --format=ai --component schemas --name installation-token | head -15
```

{% /tab %}
{% tab label="Fable 5 · run 2 · no tree" %}

```bash
wc -l github-api.yaml
grep "^  (/app/installations/\\{installation_id\\}/access_tokens|/repos/\\{owner\\}/\\{repo\\}/releases.*):" github-api.yaml
grep -n "releases" github-api.yaml | head -60
grep -n "access_tokens" github-api.yaml | head -20
sed -n '3419,3529p' github-api.yaml
grep -n "^  '/repos/\\{owner\\}/\\{repo\\}/releases" github-api.yaml
sed -n '53272,53432p' github-api.yaml
sed -n '53431,53543p' github-api.yaml
sed -n '53843,53959p' github-api.yaml
grep -n "^    installation-token:" github-api.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 2 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --help | head -40
redocly tree github-api.yaml --format=ai --find "installation access token" | head -30
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "upload release asset" | head -10
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token | head -60
redocly tree github-api.yaml --format=ai --operation repos/create-release | head -30
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset | head -30
redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset | head -20
redocly tree github-api.yaml --format=ai --find "repository installation" | head -15
```

{% /tab %}
{% tab label="Fable 5 · run 3 · no tree" %}

```bash
wc -l github-api.yaml && head -50 github-api.yaml
grep -n "releases" github-api.yaml | grep -E "^\s*[0-9]+:\s+(/|'/)" | head -30
grep -n "access_tokens\|/app/installations" github-api.yaml | head -20
sed -n '3419,3499p' github-api.yaml
sed -n '53272,53447p' github-api.yaml
sed -n '53446,53546p' github-api.yaml
sed -n '53843,53963p' github-api.yaml
grep -n "'/repos/{owner}/{repo}/installation'" github-api.yaml
grep -n "installation-token:" github-api.yaml | head -3
sed -n '45809,45854p' github-api.yaml
sed -n '87440,87485p' github-api.yaml
awk '/^    release:$/{f=1} f&&/upload_url|^      required:/{print NR": "$0} f&&/^    release-asset:/{exit}' github-api.yaml | head; grep -n "^    release:" github-api.yaml | head -3
sed -n '90926,91036p' github-api.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 3 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --search "release" | head -80
redocly tree github-api.yaml --format=ai --find "release" | head -60
redocly tree github-api.yaml --format=ai --find "installation token" | head -40
redocly tree github-api.yaml --format=ai --find "upload asset" | head -20
redocly tree github-api.yaml --format=ai --operation apps/create-installation-access-token | head -60
redocly tree github-api.yaml --format=ai --operation repos/upload-release-asset | head -40
redocly tree github-api.yaml --format=ai --operation apps/get-repo-installation | head -20; echo ---; redocly tree github-api.yaml --format=ai --operation repos/delete-release-asset | head -15
redocly tree github-api.yaml --format=ai --operation repos/create-release | head -25
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
Skill
cat github-api.yaml
grep "(?i)(create.*release|upload.*asset|delete.*asset|release.*upload)" github-api.yaml
grep "operationId: repos/(create-release|upload-release-asset|delete-release-asset|get-release)" github-api.yaml
grep "upload-release-asset.*response" github-api.yaml
grep "53940|53945|53950" github-api.yaml
grep "release-asset-response-for-successful-upload" github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --grep "release" 2>/dev/null | head -100
redocly tree github-api.yaml --format=ai --grep "asset" 2>/dev/null | head -100
grep -i "release\|asset" github-api.yaml | head -30
grep -E "'/repos.*release|'/repos.*asset" github-api.yaml | head -30
cat github-api.yaml
awk '/^\s*\/repos\/\{owner\}\/\{repo\}\/releases:$/,/^\s*\/repos\/\{owner\}\/\{repo\}\/releases\/{release_id}:$/' github-api.yaml | head -200
grep -n "'/repos/{owner}/{repo}/releases" github-api.yaml
sed -n '53272,53422p' github-api.yaml
sed -n '53843,53953p' github-api.yaml
sed -n '53431,53536p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
Skill
cat github-api.yaml
grep "releases|asset"  | head -100
grep "releases|asset" github-api.yaml | head -150
grep "POST.*releases\\\"|create.*release|tag_name|draft|prerelease" github-api.yaml | head -200
grep "Upload a release asset|upload_url|release_id.*assets|browser_download_url" github-api.yaml | head -250
grep "Delete a release asset|repos/delete-release-asset" github-api.yaml | head -100
grep "Authorization|X-GitHub|authentication|Bearer|token|github-app" github-api.yaml | head -100
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree github-api.yaml --format=ai | head -100
redocly tree github-api.yaml --format=ai --find=release
redocly tree github-api.yaml --format=ai --find=upload asset
redocly tree github-api.yaml --format=ai --find=asset | grep -i upload
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases/\{release_id\}/assets --operation=post --with-deps
redocly tree github-api.yaml --format=ai --path=/repos/\{owner\}/\{repo\}/releases/assets/\{asset_id\} --operation=delete --with-deps
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat github-api.yaml
grep "releases|assets" github-api.yaml | head -100
grep "/repos.*release|/repos.*asset" github-api.yaml | head -50
sed -n '53272,53472p' github-api.yaml
sed -n '53469,53569p' github-api.yaml
sed -n '53843,53993p' github-api.yaml
grep "upload_url|release-asset|release:" github-api.yaml | head -30
sed -n '90926,90976p' github-api.yaml
sed -n '90866,90926p' github-api.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree github-api.yaml --format=ai --filter="release"
redocly tree github-api.yaml --format=ai --find="release"
redocly tree github-api.yaml --format=ai --operation="post" --path="/repos/{owner}/{repo}/releases" --with-deps
redocly tree github-api.yaml --format=ai --find="upload asset"
redocly tree github-api.yaml --format=ai --operation="post" --path="/repos/{owner}/{repo}/releases/{release_id}/assets" --with-deps
redocly tree github-api.yaml --format=ai --operation="delete" --path="/repos/{owner}/{repo}/releases/assets/{asset_id}" --with-deps
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Sonnet 5, Opus 5 and Fable 5 pass every run on both sides, so here the index buys tool calls and price rather than correctness: 7 calls against 14 for Sonnet 5, 9 against 10 for Fable 5.
Haiku 4.5 fails the same way each time — it declares an installation token in the flow and never calls the endpoint that mints one — and gets there once with the index, never without.

{% /tab %}
{% tab label="Billing API · 1.3 MB" %}

**Task:** put an existing customer onto a recurring plan, with nothing else set up yet.
Expected: `POST /products` → `POST /plans` → `POST /subscriptions`.
Traps: the subscription body requires `orderType`, `customerId`, `websiteId` and `items`, and every call needs the `SecretApiKey` header.

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

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree rebilly.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |        no tree |           tree | Difference |
| --------- | -------------: | -------------: | ---------: |
| Sonnet 5  | 31,179 / 32 ❌ | 25,231 / 11 ❌ |       −19% |
| Opus 5    |    35,212 / 32 |    32,019 / 21 |        −9% |
| Fable 5   |    32,043 / 30 |    18,329 / 11 |       −43% |
| Haiku 4.5 | 19,459 / 16 ❌ | 17,174 / 14 ❌ |       −12% |

What those runs were billed:

| Model     |  no tree |     tree | Difference |
| --------- | -------: | -------: | ---------: |
| Sonnet 5  | $1.05 ❌ | $0.49 ❌ |       −53% |
| Opus 5    |    $1.56 |    $1.00 |       −36% |
| Fable 5   |    $2.82 |    $1.32 |       −53% |
| Haiku 4.5 | $0.16 ❌ | $0.14 ❌ |       −12% |

Whether each run produced a flow that would run:

| Run               | no tree                                       | tree                               |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| Sonnet 5 · run 1  | no auth scheme                                | no product call, no auth scheme    |
| Sonnet 5 · run 2  | no auth scheme                                | wrong auth header                  |
| Sonnet 5 · run 3  | no auth scheme                                | no auth scheme                     |
| Opus 5 · run 1    | works                                         | works                              |
| Opus 5 · run 2    | works                                         | works                              |
| Opus 5 · run 3    | works                                         | works                              |
| Fable 5 · run 1   | works                                         | works                              |
| Fable 5 · run 2   | works                                         | works                              |
| Fable 5 · run 3   | works                                         | works                              |
| Haiku 4.5 · run 1 | no product call, no plan call, no auth scheme | no product call, wrong auth header |
| Haiku 4.5 · run 2 | no product call, no plan call, no auth scheme | no product call, no auth scheme    |
| Haiku 4.5 · run 3 | no auth scheme                                | no product call, no auth scheme    |

A run works when its flow contains `POST /products`, `POST /plans` and `POST /subscriptions`, names the four fields the subscription body requires — `orderType`, `customerId`, `websiteId`, `items` — and sends the secret key in the `REB-APIKEY` header the description declares.
Naming the `SecretApiKey` scheme and then putting the key in `Authorization` counts as a failure, because Rebilly answers those calls with 401.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
wc -l rebilly.yaml
grep "^  /(subscriptions|plans|customers)" rebilly.yaml
sed -n '31004,31184p' rebilly.yaml
sed -n '32539,32789p' rebilly.yaml
grep -n "SubscriptionOrder:$|^    SubscriptionOrder:" rebilly.yaml
grep -n "requestBodies:|^  Subscription:$" rebilly.yaml
grep "^    Subscription:\" -A 5|Subscription:\\n" rebilly.yaml
sed -n '20150,20190p' rebilly.yaml
grep -n "^    Subscription:" rebilly.yaml
sed -n '20470,20490p' rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSale:" rebilly.yaml
sed -n '16038,16098p' rebilly.yaml
sed -n '15233,15353p' rebilly.yaml
grep -n "paymentInstrument|paymentMethod|billingAddress|deliveryAddress|websiteId:|items:\" -A3" rebilly.yaml
awk 'NR==15233,NR==15900' rebilly.yaml | grep -n "paymentInstrument\|paymentMethod\|billingAddress\|deliveryAddress\|websiteId:\|items:\|planId\|OrderItem"
sed -n '15380,15660p' rebilly.yaml
grep "payment-instruments" rebilly.yaml
grep -n "payment-instruments" rebilly.yaml
sed -n '30460,30660p' rebilly.yaml
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20471p' rebilly.yaml
grep -n "^    PaymentCardCreatePlain:" rebilly.yaml
sed -n '10892,10982p' rebilly.yaml
grep -n "^    Plan:" rebilly.yaml
sed -n '12201,12301p' rebilly.yaml
grep -n "^    SubscriptionPlan:" rebilly.yaml
sed -n '11888,11978p' rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15199p' rebilly.yaml
grep -n "^  /websites:" rebilly.yaml
grep "websites" rebilly.yaml
grep -n "/website|WebsiteId:" rebilly.yaml
sed -n '2897,2912p' rebilly.yaml
grep -n "^    PlanPriceFormula:|^    PlanFormulaFlatRate:" rebilly.yaml
sed -n '11222,11262p' rebilly.yaml
sed -n '11973,12003p' rebilly.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai --filter="*subscription*" | head -200
redocly tree rebilly.yaml --format=ai --find="subscription" | head -300
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -400
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan | head -40
redocly tree rebilly.yaml --format=ai --find="payment-instruments" | head -60
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardCreatePlain | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=CustomerId | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
wc -l rebilly.yaml
Agent
ScheduleWakeup
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai --paths-matching '*subscription*' | head -100
redocly tree rebilly.yaml --format=ai --find subscription | head -200
redocly tree rebilly.yaml --format=ai --path /subscriptions --operation post --with-deps | head -400
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionOrOneTimeSaleItem | head -150
redocly tree rebilly.yaml --format=ai --component schemas --name OriginalPlan
redocly tree rebilly.yaml --format=ai --component schemas --name FlexiblePlan
redocly tree rebilly.yaml --format=ai --find "plans" | head -60
redocly tree rebilly.yaml --format=ai --path /plans --operation post --with-deps | head -100
redocly tree rebilly.yaml --format=ai --component schemas --name Product | head -60
redocly tree rebilly.yaml --format=ai --find "recurringInterval" | head -30
redocly tree rebilly.yaml --format=ai --component schemas --name PlanPriceFormula | head -40
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionPlan
redocly tree rebilly.yaml --format=ai --component schemas --name Subscription | head -80
redocly tree rebilly.yaml --format=ai --component schemas --name PlanFormulaFlatRate
redocly tree rebilly.yaml --format=ai --find "payment-instrument" | head -40
redocly tree rebilly.yaml --format=ai --path /payment-instruments --operation post --with-deps | head -120
redocly tree rebilly.yaml --format=ai --component securitySchemes | head -30
redocly tree rebilly.yaml --format=ai | head -20
redocly tree rebilly.yaml --format=ai --path /products --operation post --with-deps | head -20
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
wc -l rebilly.yaml
grep "^  /(subscriptions|plans|customers)" rebilly.yaml
grep "^  /[a-zA-Z]" rebilly.yaml
sed -n '31004,31184p' rebilly.yaml
grep -n "^    Plan:" rebilly.yaml
grep -n "^    Plan:$" rebilly.yaml
sed -n '12201,12341p' rebilly.yaml
grep -n "^    SubscriptionPlan:" rebilly.yaml
sed -n '11888,12068p' rebilly.yaml
sed -n '30460,30580p' rebilly.yaml
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20501p' rebilly.yaml
grep -n "^    PaymentInstrumentCreateToken:|^    PaymentCardCreatePlain:" rebilly.yaml
sed -n '10876,10976p' rebilly.yaml
sed -n '32539,32669p' rebilly.yaml
sed -n '32669,32784p' rebilly.yaml
grep -n "^    SubscriptionOrder:" rebilly.yaml
grep -n "SubscriptionOrOneTimeSale:|OrderItem:|OrderItemPlan:" rebilly.yaml
sed -n '16038,16258p' rebilly.yaml
grep -n "^    Subscription:$|^    OneTimeSale:$" rebilly.yaml
sed -n '15233,15373p' rebilly.yaml
grep -n "paymentInstrument|websiteId|billingAddress\" -n\" -A0" rebilly.yaml | head -40
sed -n '15380,15560p' rebilly.yaml
sed -n '15559,15739p' rebilly.yaml
grep -n "/websites\\b|WebsiteId:" rebilly.yaml
sed -n '2897,2912p' rebilly.yaml
grep -n "^    SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15199p' rebilly.yaml
sed -n '31374,31434p' rebilly.yaml
grep -n "^    PlanPriceFormula:|^    PlanFormulaFlatRate:" rebilly.yaml
sed -n '11222,11262p' rebilly.yaml
# write /private/tmp/claude-501/-Users-tora-bench-run-work/76e23816-434b-4669-bdaf-7094dddd6453/scratchpad/rebilly-recurring-flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai --depth 2 | head -100
redocly tree rebilly.yaml --format=ai --find "subscription" | head -150
redocly tree rebilly.yaml --format=ai --path /subscriptions/{id} --operation put --with-deps | head -250
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionOrOneTimeSaleItem --with-deps | head -150
redocly tree rebilly.yaml --format=ai --find "plan" | head -60
redocly tree rebilly.yaml --format=ai --find "product" | head -40
echo ---
redocly tree rebilly.yaml --format=ai --path /plans --operation post --with-deps | head -100
redocly tree rebilly.yaml --format=ai --component schemas --name Product --with-deps | head -60
echo "=== PostProduct ==="
redocly tree rebilly.yaml --format=ai --path /products --operation post | head -30
echo "=== PlanPriceFormula ==="
redocly tree rebilly.yaml --format=ai --component schemas --name PlanPriceFormula --with-deps | head -20
echo "=== SubscriptionPlan full ==="
redocly tree rebilly.yaml --format=ai --component schemas --name SubscriptionPlan | head -5
echo "=== PostSubscription ==="
redocly tree rebilly.yaml --format=ai --path /subscriptions --operation post --with-deps | head -60
redocly tree rebilly.yaml --format=ai --find "payment-instrument" | head -30
echo "=== WebsiteId ==="
redocly tree rebilly.yaml --format=ai --component schemas --name WebsiteId | head -10
echo "=== CustomerId ==="
redocly tree rebilly.yaml --format=ai --component schemas --name CustomerId | head -10
redocly tree rebilly.yaml --format=ai --path /payment-instruments --operation post --with-deps | head -40
redocly tree rebilly.yaml --format=ai --component schemas --name PlanFormulaFixedFee | head -10
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -nE "^  /" rebilly.yaml | head -200
sed -n '31374,31530p' rebilly.yaml
grep -nE "^    (Product|Plan|Subscription|PaymentInstrument|PaymentToken|PaymentCardToken|Token|SubscriptionOrder|PlanTrial|PlanPricing|ReadyToPay):" rebilly.yaml
sed -n '12201,12300p' rebilly.yaml && echo "=====PRODUCT REQBODY=====" && sed -n '20455,20490p' rebilly.yaml
grep -nE "^    (SubscriptionPlan|OneTimeSalePlan|PlanRecurringFields|SubscriptionOrOneTimeSale|PlanPriceFields|PlanCommonFields):" rebilly.yaml
sed -n '11888,12201p' rebilly.yaml
grep -n "PlanPriceFormula:\|FixedPricePlan:\|PlanSetup:" rebilly.yaml
sed -n '11540,11650p' rebilly.yaml
grep -n "PlanFormulaFixedFee:" rebilly.yaml
sed -n '11168,11215p' rebilly.yaml
sed -n '16038,16070p' rebilly.yaml && echo "===SUBSCRIPTION 15233===" && sed -n '15233,15420p' rebilly.yaml
grep -nE "^  /" rebilly.yaml | sed -n '200,400p'
sed -n '37283,37292p' rebilly.yaml && echo "===gateway 36839===" && sed -n '36836,36845p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "    CompositeToken:" rebilly.yaml && sed -n '17081,17180p' rebilly.yaml
sed -n '30460,30480p' rebilly.yaml && grep -n "^      PaymentInstrument:\|^    PaymentInstrumentCreateToken:\|^    PaymentCardCreateToken:\|^    PaymentInstrumentToken:" rebilly.yaml && grep -n "requestBodies:" rebilly.yaml
grep -n "post:" rebilly.yaml | awk -F: '$1>30460 && $1<30780' | head -3
sed -n '30551,30590p' rebilly.yaml && echo "===PaymentInstrumentCreateToken 10876===" && sed -n '10876,10960p' rebilly.yaml
sed -n '15420,15620p' rebilly.yaml | grep -nE "^        [a-zA-Z_]+:|websiteId|paymentInstrumentId|items:|riskMetadata"
sed -n '15503,15520p;15537,15545p;15564,15580p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSaleItem:\|    WebsiteId:" rebilly.yaml
sed -n '15099,15150p' rebilly.yaml && echo "===WebsiteId===" && sed -n '2897,2910p' rebilly.yaml
grep -n "    OriginalPlan:\|    FlexiblePlan:" rebilly.yaml
sed -n '12321,12360p' rebilly.yaml
grep -n "^servers:" rebilly.yaml && sed -n "$(grep -n '^servers:' rebilly.yaml | head -1 | cut -d: -f1),+12p" rebilly.yaml && echo "===SEC===" && grep -n "^  securitySchemes:" rebilly.yaml && sed -n "$(grep -n '^  securitySchemes:' rebilly.yaml | cut -d: -f1),+40p" rebilly.yaml
sed -n '223,245p' rebilly.yaml
awk 'NR>=32539 && NR<=32782 && /^    post:/{f=NR} END{}' rebilly.yaml; grep -n "^    post:" rebilly.yaml | awk -F: '$1>32539 && $1<32782'; echo "---"; sed -n '32660,32700p' rebilly.yaml
sed -n '32631,32660p' rebilly.yaml && echo "===PLANS POST===" && grep -n "^    post:" rebilly.yaml | awk -F: '$1>31004 && $1<31181' && sed -n '31090,31120p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml && sed -n "$(grep -n '    PostPaymentInstrument:' rebilly.yaml | head -1 | cut -d: -f1),+14p" rebilly.yaml && echo "===ContactObject===" && sed -n "$(grep -n '^    ContactObject:' rebilly.yaml | head -1 | cut -d: -f1),+20p" rebilly.yaml
sed -n '10722,10790p' rebilly.yaml | grep -n "status" -A 14
grep -n "PaymentInstrumentStatus\|          - inactive" rebilly.yaml | head -10
sed -n '9960,9980p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -50
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs
redocly tree rebilly.yaml --format=ai --tag=Products
echo "=====PLANS====="
redocly tree rebilly.yaml --format=ai --tag=Plans
echo "=====ORDERS====="
redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps | head -80
echo "=====PLAN POST====="
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -120
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps | head -40
echo "=====FLATRATE====="
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate | head -20
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -60
redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -8
echo "=====PI====="
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
echo "=====PT====="
redocly tree rebilly.yaml --format=ai --tag="Payment tokens"
echo "=====SubItem====="
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan | head -8
echo "=====FLEX====="
redocly tree rebilly.yaml --format=ai --component=schemas --name=FlexiblePlan | head -8
echo "=====find websites====="
redocly tree rebilly.yaml --format=ai --find=website | head -30
redocly tree rebilly.yaml --format=ai --path=/payment-instruments --operation=post --with-deps | head -45
redocly tree rebilly.yaml --format=ai --pointer='#/components/requestBodies/PostPaymentInstrument' | head -12
echo "=====PostToken====="
redocly tree rebilly.yaml --format=ai --path=/tokens --operation=post --with-deps | head -30
redocly tree rebilly.yaml --format=ai --component=schemas --name=PaymentCardToken | head -8
sed -n '15234,15260p;15380,15470p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --tag=Customers
echo "=====Customer schema====="
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer | head -4
awk 'NR>=15234 && NR<=15791' rebilly.yaml | grep -n -A12 "^        currency:" | head -20
echo "=====paymentInstrumentId====="
awk 'NR>=15234 && NR<=15791' rebilly.yaml | grep -n -A14 "^        paymentInstrumentId:" | head -20
echo "=====items====="
awk 'NR>=15234 && NR<=15791' rebilly.yaml | grep -n -A10 "^        items:" | head -14
redocly tree rebilly.yaml --format=ai --find="gateway account" | head -12
echo "=====Invoices====="
redocly tree rebilly.yaml --format=ai --tag=Invoices | head -20
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey | head -6
echo "=====expand====="
redocly tree rebilly.yaml --format=ai --component=parameters --name=subscriptionExpand | head -6
redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject | sed -n '2,3p' | cut -c1-1200
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
ls -la rebilly.yaml && wc -l rebilly.yaml
grep -n "^  /" rebilly.yaml | head -300
sed -n '31374,31530p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    PaymentInstrument\|^    PaymentCardToken\|^    Token:\|^    Customer:\|^    Website:\|^    PaymentCard\b\|^    SubscriptionOrder\|^    PlanTrial\|^  requestBodies:\|^  schemas:\|^  parameters:" rebilly.yaml | head -60
sed -n '12195,12240p' rebilly.yaml && echo "=====ALLOFS====" && grep -n "^    Plan\|^    Product" rebilly.yaml
sed -n '12215,12330p' rebilly.yaml
grep -n "    SubscriptionPlan:\|    OneTimeSalePlan:\|    TrialOnlyPlan:\|    BasePlan:\|    RecurringInterval\|    PlanPricing" rebilly.yaml
sed -n '11888,12090p' rebilly.yaml
sed -n '11615,11650p;11222,11290p' rebilly.yaml
sed -n '32539,32790p' rebilly.yaml
sed -n '37286,37300p;36836,36845p' rebilly.yaml && echo "==GREP==" && grep -n "websites:" rebilly.yaml | head -20
sed -n '20463,20500p' rebilly.yaml && echo "===SubOrOne===" && grep -n "    SubscriptionOrOneTimeSale:\|    SubscriptionOrder:\|    OneTimeSaleOrder:\|    OrderItem:\|    OrderItemPlan:" rebilly.yaml
sed -n '16038,16070p' rebilly.yaml && echo "===Subscription schema 15233===" && sed -n '15233,15300p' rebilly.yaml
awk 'NR>=15233 && NR<=16040 && /^        [a-zA-Z_]+:/ {print NR": "$0}' rebilly.yaml
sed -n '15380,15420p;15503,15580p' rebilly.yaml
grep -n "    SubscriptionOrOneTimeSaleItem:\|    WebsiteId:\|    CustomerId:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml && echo "===WebsiteId===" && sed -n '2897,2910p;1470,1482p' rebilly.yaml
sed -n '30460,30620p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml && sed -n '10876,11070p' rebilly.yaml
sed -n '20441,20465p' rebilly.yaml
sed -n '34892,35000p' rebilly.yaml
grep -n "    CompositeToken:" rebilly.yaml && sed -n '17081,17200p' rebilly.yaml
grep -n "operationId: PostWebsite\|operationId: GetWebsite\|operationId: PostGatewayAccount\|operationId: PostPlan\|operationId: GetCustomerCollection\|operationId: PostSubscription\|operationId: PatchCustomer\|operationId: PutSubscription\|operationId: PostReadyToPay\|operationId: PostTransaction" rebilly.yaml
awk 'NR>=3509 && NR<=3700 && /^        [a-zA-Z]+:/ {print NR": "$0}' rebilly.yaml && echo "===PostPlan body===" && sed -n '31094,31180p' rebilly.yaml | grep -n "requestBody" -A6
sed -n '3509,3570p' rebilly.yaml && echo "===collectionFilter===" && sed -n '248,340p' rebilly.yaml | grep -n "collectionFilter" -A 30
grep -n "securitySchemes:" rebilly.yaml && grep -n "  servers:" rebilly.yaml | head -3 && grep -n "    ContactObject:" rebilly.yaml
sed -n '192,248p' rebilly.yaml && echo "=== SERVERS TOP ===" && sed -n '1,60p' rebilly.yaml | grep -n "servers" -A 12 && echo "=== CONTACT ===" && sed -n '3261,3300p' rebilly.yaml
grep -n "^servers:" -A 10 rebilly.yaml | head -20; echo "=== CONTACT ==="; sed -n '3261,3300p' rebilly.yaml
sed -n '166,192p' rebilly.yaml
sed -n '15306,15330p' rebilly.yaml && echo "=== ANCHOR ===" && grep -n "    ServicePeriodAnchorInstruction:" rebilly.yaml
sed -n '11743,11762p' rebilly.yaml && echo "=== OriginalPlan ===" && sed -n '12327,12360p' rebilly.yaml
awk 'NR>=3261 && NR<=3510 && /^      [a-z]+:/ {print NR": "$0}' rebilly.yaml; echo "=== CurrencyCode ==="; grep -n "    CurrencyCode:" -A 8 rebilly.yaml | head -12
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -100
redocly tree --help | head -60
redocly tree rebilly.yaml --format=ai --tag=Plans; echo ---; redocly tree rebilly.yaml --format=ai --tag=Products; echo ---; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"; echo ---; redocly tree rebilly.yaml --format=ai --tag="Payment tokens"; echo ---; redocly tree rebilly.yaml --format=ai --tag=Customers
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps | head -120
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps | head -400
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan --with-deps | head -250
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula --with-deps | head -200
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -60
redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps | head -80
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription | head -20; echo ===; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -20; echo ===; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -40
redocly tree rebilly.yaml --format=ai --find=website | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -40; echo "@@@"; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -20
sed -n '15234,15300p' rebilly.yaml
grep -n "autopay" rebilly.yaml | head -20
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps | head -40
sed -n '15390,15420p;15500,15520p' rebilly.yaml; echo "@@@ reqbody"; sed -n '20442,20452p' rebilly.yaml
sed -n '17082,17140p' rebilly.yaml
sed -n '32940,33010p' rebilly.yaml; echo "@@@ plan sample"; sed -n '31120,31185p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=securitySchemes | head -20; echo "@@@"; sed -n '12216,12245p' rebilly.yaml
sed -n '227,237p' rebilly.yaml; echo "@@@ contact"; redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject | head -12
sed -n '448,474p' rebilly.yaml
sed -n '10877,10892p' rebilly.yaml; echo "@@@"; grep -n "example: cct_" rebilly.yaml | head -3
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l rebilly.yaml && grep -c "" rebilly.yaml
grep -n "^  /(subscriptions|orders|payment-instruments|plans|products|customers|payment-tokens|transactions)" rebilly.yaml
sed -n '31374,31530p' rebilly.yaml
sed -n '31004,31185p' rebilly.yaml
grep -n "^  /(tokens|payment-tokens|digital-wallets)" rebilly.yaml
grep -n "^    (Product|Plan|Subscription|PaymentInstrument|PaymentCard|PaymentToken|SubscriptionOrderPlan|PlanFormula\\w*|PaymentInstrumentCard|CreatePaymentInstrument\\w*):" rebilly.yaml
sed -n '12195,12240p' rebilly.yaml; echo "=== SUBSCRIPTION 15233"; sed -n '15233,15250p' rebilly.yaml; echo "=== PI 10722"; sed -n '10722,10760p' rebilly.yaml
sed -n '34892,34990p' rebilly.yaml
grep -n "^  /websites" rebilly.yaml; echo "=== SubscriptionPlan schema ==="; grep -n "^    \(SubscriptionPlan\|OneTimeSalePlan\|TrialOnlyPlan\|CompositeToken\|SubscriptionOrderPlanRecurringInterval\):" rebilly.yaml
sed -n '15233,15420p' rebilly.yaml
grep -n "websites" rebilly.yaml | head -30; echo "=== 37286 ==="; sed -n '37286,37300p' rebilly.yaml
sed -n '11888,12090p' rebilly.yaml
grep -n "^  /storefront" rebilly.yaml; echo "=== websiteId schema ==="; grep -n "^    WebsiteId:" rebilly.yaml; echo "=== PlanPriceFormula ==="; grep -n "^    \(PlanPriceFormula\|PlanSetup\|PlanTrial\|SubscriptionItem\|CustomerId\):" rebilly.yaml
awk 'NR>=15420 && NR<=15760' rebilly.yaml | grep -n "^        [a-zA-Z_]*:"
echo "=== items+PI+websiteId ==="; sed -n '15500,15520p;15535,15560p;15560,15580p' rebilly.yaml; echo "=== WebsiteId 2897 ==="; sed -n '2897,2915p' rebilly.yaml; echo "=== PlanPriceFormula 11615 ==="; sed -n '11615,11650p' rebilly.yaml; echo "=== FlatRate 11222 ==="; sed -n '11222,11290p' rebilly.yaml
sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30620p' rebilly.yaml
grep -n "^    \(SubscriptionOrOneTimeSaleItem\|CreatePaymentInstrument\|PaymentInstrumentCreate\)" rebilly.yaml; echo "=== CompositeToken 17801 ==="; sed -n '17801,17900p' rebilly.yaml
grep -n "^    PostPaymentInstrument:" rebilly.yaml; echo "=== PICreateToken 10876 ==="; sed -n '10876,10940p' rebilly.yaml; echo "=== SubItem 15099 ==="; sed -n '15099,15165p' rebilly.yaml
grep -n "^    OriginalPlan:\|^    FlexiblePlan:" rebilly.yaml; echo "=== 20441 ==="; sed -n '20441,20475p' rebilly.yaml; echo "=== gateway ==="; grep -n "^  /gateway-accounts" rebilly.yaml
sed -n '32539,32660p' rebilly.yaml | grep -n "post:\|operationId\|requestBody\|\$ref\|'201'\|summary\|security\|parameters"
sed -n '36839,36848p' rebilly.yaml; echo "=== OriginalPlan 12321 ==="; sed -n '12321,12360p' rebilly.yaml
sed -n '1,60p' rebilly.yaml; echo "=== servers ==="; grep -n "^servers:" -A 30 rebilly.yaml | head -40
sed -n '192,260p' rebilly.yaml | grep -n "^    [A-Za-z]*:\|type:\|name:\|in:\|scheme:"; echo "=== SubOrOneTime ==="; grep -n "^    SubscriptionOrOneTimeSale:" rebilly.yaml
grep -n "^    PaymentCardToken:" rebilly.yaml
sed -n '16038,16060p' rebilly.yaml; echo "=== PaymentCardToken 17081 ==="; sed -n '17081,17175p' rebilly.yaml
grep -n "^    ContactObject:" rebilly.yaml
sed -n '3261,3290p' rebilly.yaml; echo "=== PlanTrial 11762 ==="; sed -n '11762,11800p' rebilly.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
ls -la && redocly tree rebilly.yaml --format=ai | head -50
redocly tree --help | head -60
redocly tree rebilly.yaml --format=ai --tag=Plans; echo ====; redocly tree rebilly.yaml --format=ai --tag=Products; echo ====; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag="Payment tokens"; echo ====; redocly tree rebilly.yaml --format=ai --tag="Payment instruments"; echo ====; redocly tree rebilly.yaml --format=ai --find="website" | head -40
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --tag=Orders
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"; redocly tree rebilly.yaml --format=ai --find="website" | head -40
redocly tree rebilly.yaml --format=ai --operation=PostProduct --with-deps | head -120
redocly tree rebilly.yaml --format=ai --operation=PostPlan --with-deps | head -300
sed -n '11889,12086p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --operation=PostSubscription --with-deps | head -80
sed -n '20471,20480p' rebilly.yaml; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem --with-deps | head -60
sed -n '15234,15260p' rebilly.yaml; grep -n "autopay\|paymentInstrumentId\|revision\|readOnly" /dev/null; sed -n '15400,15470p' rebilly.yaml
grep -n "paymentInstrumentId:" rebilly.yaml | head; sed -n '15476,15500p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --operation=PostPaymentInstrument --with-deps | head -60
sed -n '20442,20455p' rebilly.yaml; echo '--- subscription paymentInstrumentId'; sed -n '15498,15520p' rebilly.yaml; echo '--- flatrate'; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate --with-deps | head -20
redocly tree rebilly.yaml --format=ai --tag=Customers; echo '--- token'; redocly tree rebilly.yaml --format=ai --operation=PostToken --with-deps | head -40
sed -n '17082,17140p' rebilly.yaml; echo '--- contactobject'; redocly tree rebilly.yaml --format=ai --component=schemas --name=ContactObject | head -12
redocly tree rebilly.yaml --format=ai --component=securitySchemes | head -20; echo '--- invoices'; redocly tree rebilly.yaml --format=ai --tag=Invoices
sed -n '227,240p' rebilly.yaml; echo '--- sub currency/items/autopay'; awk 'NR>=15380 && NR<=15400' rebilly.yaml; echo '---'; awk 'NR>=15600 && NR<=15660' rebilly.yaml
awk 'NR>=15525 && NR<=15600' rebilly.yaml | grep -n -A6 "currency\|websiteId\|items:"
sed -n '10877,10892p' rebilly.yaml; sed -n '2898,2906p' rebilly.yaml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Fable 5 · run 1 · no tree" %}

```bash
wc -l rebilly.yaml && grep -nE "^  /" rebilly.yaml | head -100
sed -n '32539,32700p' rebilly.yaml
grep -n "Subscription:" rebilly.yaml | head; grep -n "^    Plan:\|^    Product:\|^    Subscription:\|^    Website:\|^    Customer:" rebilly.yaml
sed -n '15233,15450p' rebilly.yaml
grep -nE "^  /websites|^  /organizations" rebilly.yaml; sed -n '12201,12215p' rebilly.yaml
sed -n '37286,37420p' rebilly.yaml
sed -n '31374,31530p' rebilly.yaml
grep -n "SubscriptionPlan:\|OneTimeSalePlan:\|PlanPriceFormula\|CommonPlan:" rebilly.yaml | head
sed -n '11888,12070p' rebilly.yaml
sed -n '11615,11647p' rebilly.yaml; sed -n '12215,12290p' rebilly.yaml
grep -n "PlanFormulaFixedFee:" rebilly.yaml; grep -n "SubscriptionItems:\|SubscriptionItem:\|OrderItem" rebilly.yaml | head
sed -n '11168,11200p' rebilly.yaml; grep -n "        items:" rebilly.yaml | awk -F: '$1 > 15450 && $1 < 16200'
sed -n '15560,15680p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml
grep -n "OriginalPlan:\|FlexiblePlan:" rebilly.yaml; grep -n "paymentInstrumentId" rebilly.yaml | awk -F: '$1>15233 && $1<16400'
sed -n '12321,12345p' rebilly.yaml; sed -n '15498,15522p' rebilly.yaml
grep -nE "^  /tokens|^  /payment-tokens" rebilly.yaml; sed -n '30460,30560p' rebilly.yaml
sed -n '30560,30640p' rebilly.yaml; grep -n "PostPaymentInstrumentRequest:\|PaymentInstrumentToken\b" rebilly.yaml | head
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20463p' rebilly.yaml; grep -n "PaymentInstrumentCreation\|TokenizedPaymentInstrument\|paymentInstrument-creation" rebilly.yaml | head
grep -n "PaymentInstrumentCreateToken:\|PaymentCardCreatePlain:" rebilly.yaml
sed -n '10876,10990p' rebilly.yaml
grep -n "initialInvoiceId\|recentInvoiceId" rebilly.yaml | head; sed -n '28565,28627p' rebilly.yaml
grep -n "defaultPaymentInstrument" rebilly.yaml | head; grep -nE "^  /transactions:" rebilly.yaml
sed -n '3540,3580p' rebilly.yaml; sed -n '25753,25830p' rebilly.yaml
sed -n '25986,26000p' rebilly.yaml; grep -n "operationId: PutCustomer\|operationId: PatchCustomer\|operationId: GetCustomer\b" rebilly.yaml; grep -n "servers:" rebilly.yaml | head -3
sed -n '160,200p' rebilly.yaml; grep -n "SecretApiKey" rebilly.yaml | tail -5
grep -n -A6 "SecretApiKey:" rebilly.yaml | sed -n '1,20p'; grep -n "Plan:" rebilly.yaml | awk -F: '$1>20400 && $1<20500'; sed -n '31004,31100p' rebilly.yaml
sed -n '226,245p' rebilly.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 1 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -100
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders | head -60
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -120
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -30
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -80
redocly tree rebilly.yaml --format=ai --find=website | head -30; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -15
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -40
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula | head -8; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate | head -8
redocly tree rebilly.yaml --format=ai --tag=Customers | head -16; sed -n '20471,20477p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --component=securitySchemes | head -12
sed -n '227,236p' rebilly.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 2 · no tree" %}

```bash
wc -l rebilly.yaml && grep -n "^  /" rebilly.yaml | head -100
grep -n "^  /subscriptions" rebilly.yaml; grep -n "^  /websites" rebilly.yaml
sed -n '32539,32784p' rebilly.yaml
grep -n "websites" rebilly.yaml | grep -v "#" | head -30
sed -n '37286,37406p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSale\|^    Subscription:\|^    SubscriptionOrder:\|^    OrderItem\|^    Plan:\|^    Product:" rebilly.yaml | head; grep -n "^  requestBodies:" rebilly.yaml
sed -n '15233,15353p' rebilly.yaml
sed -n '15099,15234p' rebilly.yaml
grep -n "Website\b\|WebsiteId\|GetWebsite\|PostWebsite\|PutWebsite" rebilly.yaml | head -30
grep -n "OriginalPlan:\|FlexiblePlan:\|PlanPriceFormula\|CommonPlan\|TrialOnlyPlan\|^    Plan\b" rebilly.yaml | head
sed -n '12201,12371p' rebilly.yaml
grep -n "SubscriptionPlan:\|OneTimeSalePlan:" rebilly.yaml
sed -n '11888,12088p' rebilly.yaml
sed -n '11615,11650p' rebilly.yaml
sed -n '870,900p' rebilly.yaml
grep -n "PlanFormulaFixedFee:" rebilly.yaml; grep -n "^    Customer:" rebilly.yaml
sed -n '11168,11198p' rebilly.yaml
sed -n '3509,3629p' rebilly.yaml
sed -n '31004,31104p' rebilly.yaml
grep -n "^  /tokens\|^  /payment-tokens" rebilly.yaml
sed -n '25986,26010p;31374,31400p;31460,31480p' rebilly.yaml; grep -n "operationId" rebilly.yaml | sed -n '1,0p'; awk 'NR>=25986 && NR<=26060 && (/operationId/||/summary/)' rebilly.yaml; awk 'NR>=31374 && NR<=31530 && (/operationId/||/summary/)' rebilly.yaml; awk 'NR>=30460 && NR<=30780 && (/operationId/||/summary/)' rebilly.yaml; awk 'NR>=34892 && NR<=35170 && (/operationId/||/summary/)' rebilly.yaml
sed -n '30460,30590p' rebilly.yaml
grep -n "    PostPaymentInstrument:" rebilly.yaml; grep -n "PostPaymentInstrumentRequest\|makeDefault" rebilly.yaml | head
sed -n '20441,20476p' rebilly.yaml
grep -n "PaymentInstrumentCreateToken:" rebilly.yaml
sed -n '10876,10936p' rebilly.yaml
grep -n "VaultedInstrument:" rebilly.yaml && sed -n "$(grep -n 'VaultedInstrument:' rebilly.yaml | head -1 | cut -d: -f1),+30p" rebilly.yaml
sed -n '1,40p' rebilly.yaml; grep -n "^servers:" -A 8 rebilly.yaml | head -20
grep -n "SecretApiKey:" -A 6 rebilly.yaml | head -12
sed -n '226,240p' rebilly.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 2 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -100
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders | head -50
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -120
redocly tree rebilly.yaml --format=ai --tag=Products; redocly tree rebilly.yaml --format=ai --component=schemas --name=Product | head -30
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -60
redocly tree rebilly.yaml --format=ai --find=website | head -30; redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=Customer | head -12; redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan | head -8; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -8
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -14; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee | head -8
redocly tree rebilly.yaml --format=ai --tag=Customers | head -16
redocly tree rebilly.yaml --format=ai --component=securitySchemes | head -12
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey | head -6
```

{% /tab %}
{% tab label="Fable 5 · run 3 · no tree" %}

```bash
wc -l rebilly.yaml
grep "^  /(products|plans|subscriptions|orders|payment-instruments|tokens|customers)[^:]*:" rebilly.yaml
sed -n '31374,31560p' rebilly.yaml
sed -n '31004,31200p' rebilly.yaml
grep -n "^    Product:\|^    Plan:\|^    Subscription:\|^    Order:\|^    CommonPlan\|^    TrialOnlyPlan\|^    SubscriptionOrder\|^    OneTimeOrder\|PlanPricing\|^    CommonOrder" rebilly.yaml | head -40
sed -n '32539,32790p' rebilly.yaml
sed -n '12087,12230p' rebilly.yaml
grep -n "/websites" rebilly.yaml | head
sed -n '37286,37360p' rebilly.yaml
sed -n '15233,15420p' rebilly.yaml
grep -n "SubscriptionPlan:\|OneTimeSalePlan:" rebilly.yaml | head
sed -n '30460,30780p' rebilly.yaml
sed -n '11888,11990p' rebilly.yaml
grep -n "PostPaymentInstrument:" rebilly.yaml
sed -n '20441,20475p' rebilly.yaml; grep -n "PlanPriceFormula:\|PlanFormulaFlatRate\|flat-rate" rebilly.yaml | head
grep -n "makeDefault\|defaultPaymentInstrument\|paymentInstrumentId" rebilly.yaml | head -30
sed -n '11222,11275p' rebilly.yaml
grep -n "PaymentCardCreatePlain:" rebilly.yaml; sed -n '3540,3580p' rebilly.yaml; sed -n '15490,15530p' rebilly.yaml
sed -n '10892,10960p' rebilly.yaml
awk 'NR>=15530 && NR<=15720' rebilly.yaml | grep -n "items:"
sed -n '15560,15640p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15233p' rebilly.yaml
grep -n "    OriginalPlan:" rebilly.yaml && sed -n "$(grep -n '    OriginalPlan:' rebilly.yaml | cut -d: -f1),+20p" rebilly.yaml
grep -n -A6 "SecretApiKey:" rebilly.yaml | head -12
sed -n '226,245p' rebilly.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 3 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -100
redocly tree rebilly.yaml --format=ai --tag=Plans; redocly tree rebilly.yaml --format=ai --tag=Orders | head -60
redocly tree rebilly.yaml --format=ai --path=/products --operation=post --with-deps | head -60
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -120
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -80
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -80
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -40; echo ===; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -15; echo ===; redocly tree rebilly.yaml --format=ai --find=website | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan | head -12; redocly tree rebilly.yaml --format=ai --component=schemas --name=WebsiteId | head -10; redocly tree rebilly.yaml --format=ai --find=websites | head -20
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula | head -12; redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFlatRate | head -10; redocly tree rebilly.yaml --format=ai --tag=Customers | head -16
redocly tree rebilly.yaml --format=ai --component=securitySchemes | head -20
redocly tree rebilly.yaml --format=ai --component=securitySchemes --name=SecretApiKey | head -8
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat rebilly.yaml
grep "recurring|subscription|plan|billing" rebilly.yaml | head -100
grep "^  /.*subscription|^  /.*plan" rebilly.yaml
sed -n '32539,32789p' rebilly.yaml
grep "^  /customer" rebilly.yaml
sed -n '31004,31184p' rebilly.yaml
grep "Subscription.*\\n.*description:|^    Subscription:" rebilly.yaml | head -50
grep "components.*schemas|^  [A-Z][a-zA-Z]+:\\n    type: object" rebilly.yaml
grep -n "^components:" rebilly.yaml | head -5
grep -n "^\s*Subscription:" rebilly.yaml
sed -n '15233,15433p' rebilly.yaml
sed -n '15430,15630p' rebilly.yaml
grep -n "SubscriptionOrOneTimeSaleItem:" rebilly.yaml
sed -n '15099,15239p' rebilly.yaml
grep -n "OriginalPlan:" rebilly.yaml
sed -n '12321,12401p' rebilly.yaml
grep -n "^  /website" rebilly.yaml
grep -n "^  /website" rebilly.yaml | head -20
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -100
redocly tree rebilly.yaml --format=ai --find="subscription"
redocly tree rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps | head -200
redocly tree rebilly.yaml --format=ai --component=requestBodies --name=Subscription
redocly tree rebilly.yaml --format=ai --component=schemas --name=Subscription | head -150
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=OriginalPlan | head -100
cat rebilly.yaml
redocly tree rebilly.yaml --format=ai --find="plans" --tag="Plans" | head -50
redocly tree rebilly.yaml --format=ai --tag=Plans
redocly tree rebilly.yaml --format=ai --path=/plans --operation=post --with-deps | head -150
redocly tree rebilly.yaml --format=ai --component=schemas --name=SubscriptionPlan | head -200
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanPriceFormula | head -100
redocly tree rebilly.yaml --format=ai --component=schemas --name=PlanFormulaFixedFee
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat rebilly.yaml
grep "recurring|subscription|plan|billing-cycle" rebilly.yaml
grep "^  /.*subscription|^  /.*plan|^  /.*billing" rebilly.yaml | head -50
sed -n '32539,32789p' rebilly.yaml
grep "requestBodies.*Subscription|components:\\s+requestBodies:|Subscription:" rebilly.yaml | head -20
grep "^\\s+Subscription:\\s*$" rebilly.yaml | head -10
sed -n '15233,15283p' rebilly.yaml
sed -n '15280,15430p' rebilly.yaml
sed -n '15400,15600p' rebilly.yaml
grep "SubscriptionOrOneTimeSaleItem:" rebilly.yaml | head -5
sed -n '15099,15249p' rebilly.yaml
sed -n '31004,31124p' rebilly.yaml
grep "^  /customers|^  /payment-instruments|^  /payment-methods" rebilly.yaml | head -30
sed -n '30460,30580p' rebilly.yaml
sed -n '25753,25853p' rebilly.yaml
sed -n '25986,26086p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree rebilly.yaml --format=ai | head -200
redocly tree rebilly.yaml --format=ai --find="subscription|recurring|plan" | head -150
redocly tree rebilly.yaml --format=ai --tag="Orders"
redocly tree rebilly.yaml --format=ai --tag="Plans"
redocly tree rebilly.yaml --format=ai --path="/subscriptions" --operation="post" --with-deps
sed -n '32632,32832p' rebilly.yaml
redocly tree rebilly.yaml --format=ai --component="requestBodies" --name="Subscription"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="Subscription" | head -100
redocly tree rebilly.yaml --format=ai --component="schemas" --name="SubscriptionOrOneTimeSaleItem"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="OriginalPlan"
redocly tree rebilly.yaml --format=ai --tag="Payment instruments"
redocly tree rebilly.yaml --format=ai --tag="Customers"
redocly tree rebilly.yaml --format=ai --path="/plans" --operation="post" --with-deps | head -150
redocly tree rebilly.yaml --format=ai --component="schemas" --name="SubscriptionPlan" | head -150
redocly tree rebilly.yaml --format=ai --component="schemas" --name="PlanPriceFormula"
redocly tree rebilly.yaml --format=ai --component="schemas" --name="PlanFormulaFixedFee"
redocly tree rebilly.yaml --format=ai --path="/plans" --operation="get" --with-deps | head -100
redocly tree rebilly.yaml --format=ai --path="/customers/{id}" --operation="get" | head -80
redocly tree rebilly.yaml --format=ai --find="website" | head -30
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat rebilly.yaml
grep "recurring|subscription|plan" /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs
grep "^\\s+/subscriptions|^\\s+/plans|POST.*subscription|POST.*plan" rebilly.yaml | head -100
sed -n '31004,31504p' rebilly.yaml
sed -n '32539,33139p' rebilly.yaml
grep "components:\\s*schemas:|Subscription:|Plan:" rebilly.yaml | head -50
sed -n '15233,15633p' rebilly.yaml
grep "SubscriptionOrOneTimeSaleItem:" rebilly.yaml | head -5
sed -n '15099,15399p' rebilly.yaml
sed -n '12321,12471p' rebilly.yaml
sed -n '12201,12451p' rebilly.yaml
sed -n '11888,12288p' rebilly.yaml
grep "PlanPriceFormula:" rebilly.yaml | head -2
sed -n '11615,11815p' rebilly.yaml
grep "PlanFormulaFlatRate:" rebilly.yaml | head -1
sed -n '11222,11322p' rebilly.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
redocly tree specs/rebilly.yaml --format=ai | head -200
redocly tree specs/rebilly.yaml --format=ai --find=subscription
redocly tree specs/rebilly.yaml --format=ai --path=/subscriptions --operation=post --with-deps
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=Subscription
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=SubscriptionOrOneTimeSaleItem
redocly tree specs/rebilly.yaml --format=ai --component=schemas --name=OriginalPlan
redocly tree specs/rebilly.yaml --format=ai --find=plan --tag=Plans
redocly tree specs/rebilly.yaml --format=ai --tag=Plans
redocly tree specs/rebilly.yaml --format=ai --tag=Customers
redocly tree specs/rebilly.yaml --format=ai --find="payment instrument"
redocly tree specs/rebilly.yaml --format=ai --find=website
sed -n '32632,32832p' rebilly.yaml
redocly tree specs/rebilly.yaml --format=ai --find="payment token"
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

Opus 5 and Fable 5 pass every run on both sides, and the index cuts their work roughly in half: 21 calls against 32, 11 against 30.
Sonnet 5 and Haiku 4.5 never pass, and almost always for one reason: the sequence of calls is right and the request is unauthenticated.
Nine of those runs never mention the key at all; two name it and send it as `Authorization`, which this API rejects.

{% /tab %}
{% tab label="Cafe API · 41 KB" %}

**Task:** a mobile app that browses the menu, orders a coffee, and follows that order until it is ready.
Expected: `POST /oauth2/token` → `GET /menu` → `POST /orders` → `GET /orders/{orderId}`.
Trap: ordering and checking status need OAuth2 scopes, so a flow without the token call returns 401 twice.

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

The Redocly CLI is installed. Searching the description is easier with `tree --format=ai <flags>`:
redocly tree cafe.yaml --format=ai <flags>

Give me a working flow as JSON in your reply: the steps in order, what each one calls, what it
needs, and what to carry from its response into the next step. It has to work as written.
```

{% /tab %}
{% /tabs %}

Context the run added, and the tool calls it took:

| Model     |    no tree |        tree | Difference |
| --------- | ---------: | ----------: | ---------: |
| Sonnet 5  | 18,287 / 2 |   8,474 / 5 |       −54% |
| Opus 5    | 16,769 / 1 | 17,103 / 11 |        +2% |
| Fable 5   | 16,882 / 1 |   9,889 / 9 |       −41% |
| Haiku 4.5 | 15,008 / 1 |   7,604 / 8 |       −49% |

What those runs were billed:

| Model     | no tree |  tree | Difference |
| --------- | ------: | ----: | ---------: |
| Sonnet 5  |   $0.27 | $0.26 |        −4% |
| Opus 5    |   $0.41 | $0.58 |       +41% |
| Fable 5   |   $0.72 | $0.82 |       +14% |
| Haiku 4.5 |   $0.07 | $0.09 |       +29% |

Whether each run produced a flow that would run:

| Run               | no tree       | tree          |
| ----------------- | ------------- | ------------- |
| Sonnet 5 · run 1  | works         | works         |
| Sonnet 5 · run 2  | works         | works         |
| Sonnet 5 · run 3  | works         | works         |
| Opus 5 · run 1    | works         | works         |
| Opus 5 · run 2    | works         | works         |
| Opus 5 · run 3    | works         | works         |
| Fable 5 · run 1   | works         | works         |
| Fable 5 · run 2   | works         | works         |
| Fable 5 · run 3   | works         | works         |
| Haiku 4.5 · run 1 | no token call | no token call |
| Haiku 4.5 · run 2 | no token call | works         |
| Haiku 4.5 · run 3 | works         | no token call |

A run works when its flow contains `POST /oauth2/token`, `GET /menu`, `POST /orders` and `GET /orders/{orderId}`, all against `api.cafe.redocly.com`.

What each run ran:

{% tabs %}
{% tab label="Sonnet 5" %}

{% tabs %}
{% tab label="Sonnet 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
# write /private/tmp/claude-501/-Users-tora-bench-run-work/3793be51-c777-4a8d-913c-56f8baf77958/scratchpad/cafe-flow.json
```

{% /tab %}
{% tab label="Sonnet 5 · run 1 · tree" %}

```bash
redocly tree cafe.yaml --format=ai | head -300
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
mkdir -p /private/tmp/claude-501/-Users-tora-bench-run-work/d7cb2634-9fd0-4c2d-a433-16add0decb91/scratchpad
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
Artifact
```

{% /tab %}
{% tab label="Sonnet 5 · run 2 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/order-items --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
redocly tree cafe.yaml --format=ai --find=webhook --with-deps
redocly tree cafe.yaml --format=ai --find=webhook
sed -n '665,710p' cafe.yaml
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Sonnet 5 · run 3 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2
redocly tree cafe.yaml --format=ai --find=order-notification --with-deps
redocly tree cafe.yaml --format=ai --find=order-notification
grep -n "oauth2/token\|/oauth2" cafe.yaml | head -30
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Opus 5" %}

{% tabs %}
{% tab label="Opus 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 1 · tree" %}

```bash
wc -l cafe.yaml && redocly tree cafe.yaml --format=ai | head -100
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps | head -60; echo ====; redocly tree cafe.yaml --format=ai --component=securitySchemes | head -40
redocly tree cafe.yaml --format=ai --component=securitySchemes | head -40
sed -n '680,730p' cafe.yaml
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps | head -40
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps | head -40
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps | head -30
sed -n '1033,1106p' cafe.yaml
redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId} --operation=get | head -20
sed -n '196,232p' cafe.yaml; echo '--- PhotoSize'; sed -n '793,822p' cafe.yaml
sed -n '868,986p' cafe.yaml
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=patch | head -20; echo '--- delete'; redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=delete | head -10
redocly tree cafe.yaml --format=ai --path=/order-items --operation=get | head -20; echo '--- webhook'; sed -n '662,684p' cafe.yaml
sed -n '1108,1206p' cafe.yaml; echo '--- Limit param'; sed -n '778,792p' cafe.yaml
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderNotification | head -20
```

{% /tab %}
{% tab label="Opus 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 2 · tree" %}

```bash
redocly tree cafe.yaml --format=ai | head -100
redocly tree --help | head -60; echo ---; wc -l cafe.yaml
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; for op in registerOAuth2Client listMenuItems getMenuItemPhoto createOrder; do echo "=== $op"; redocly tree cafe.yaml --format=ai --operation=$op --with-deps; done
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; for op in getOrderById listOrderItems updateOrder; do echo "=== $op"; redocly tree cafe.yaml --format=ai --operation=$op --with-deps; done; echo "=== security"; redocly tree cafe.yaml --format=ai --component=securitySchemes
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; echo "=== path photo"; redocly tree cafe.yaml --format=ai --path=/menu-item-images/{menuItemId}; echo "=== PhotoSize"; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize --with-deps
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; for c in Order OrderItem MenuItem Beverage MenuBaseItem; do echo "=== $c"; redocly tree cafe.yaml --format=ai --component=schemas --name=$c --with-deps | head -60; done; echo "=== webhook"; redocly tree cafe.yaml --format=ai --webhook=order-notification --with-deps | head -50
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; redocly tree cafe.yaml --format=ai --webhook=order-notification --operation=post | head -40; echo "=== listOrders"; redocly tree cafe.yaml --format=ai --operation=listOrders | head -40
cd /Users/tora/Desktop/Projects/tree-bench-kit-v2/specs; redocly tree cafe.yaml --format=ai --operation=deleteOrder | head -12; redocly tree cafe.yaml --format=ai --component=schemas --name=OrderNotification | head -12; redocly tree cafe.yaml --format=ai --component=parameters --name=Limit | head -12
```

{% /tab %}
{% tab label="Opus 5 · run 3 · no tree" %}

```bash
wc -l cafe.yaml
cat cafe.yaml
```

{% /tab %}
{% tab label="Opus 5 · run 3 · tree" %}

```bash
redocly tree cafe.yaml --format=ai | head -100
redocly tree --help | head -60
redocly tree cafe.yaml --format=ai --operation=registerOAuth2Client --with-deps | head -120
redocly tree cafe.yaml --format=ai --component=securitySchemes | head -60
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps | head -60; echo "=== APIKEY ==="; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=ApiKey --with-deps | head -30
for op in listMenuItems createOrder getOrderById; do echo "##### $op"; redocly tree cafe.yaml --format=ai --operation=$op --with-deps | head -80; done
echo "##### Order"; redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps | head -60; echo; echo "##### MenuItem/Beverage"; redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage --with-deps | head -40
echo "##### photo"; redocly tree cafe.yaml --format=ai --operation=getMenuItemPhoto | head -30; echo; echo "##### webhook"; redocly tree cafe.yaml --format=ai --operation=orderNotificationWebhook --with-deps | head -40; echo; echo "##### listOrderItems"; redocly tree cafe.yaml --format=ai --operation=listOrderItems | head -30
echo "##### MenuBaseItem"; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem | head -20; echo; echo "##### PhotoSize"; redocly tree cafe.yaml --format=ai --component=parameters --name=PhotoSize | head -20; echo; echo "##### OrderItem"; redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem|head -20
sed -n '1,32p;196,230p' cafe.yaml; echo "=== updateOrder ==="; redocly tree cafe.yaml --format=ai --operation=updateOrder | head -25
redocly tree cafe.yaml --format=ai --operation=listOrders | head -20
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Fable 5" %}

{% tabs %}
{% tab label="Fable 5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 1 · tree" %}

```bash
redocly tree cafe.yaml --format=ai | head -100
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps; echo ===; redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps; echo ===; redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps; echo ===; redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem
redocly tree cafe.yaml --format=ai --path='/menu-item-images/{menuItemId}' --operation=get
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% tab label="Fable 5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 2 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps; redocly tree cafe.yaml --format=ai --component=securitySchemes --name=ApiKey
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --path='/menu-item-images/{menuItemId}' --operation=get
```

{% /tab %}
{% tab label="Fable 5 · run 3 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Fable 5 · run 3 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=securitySchemes
redocly tree cafe.yaml --format=ai --component=securitySchemes --name=OAuth2 --with-deps
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path='/orders/{orderId}' --operation=get --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Order --with-deps; redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% tab label="Haiku 4.5" %}

{% tabs %}
{% tab label="Haiku 4.5 · run 1 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 1 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 2 · tree" %}

```bash
redocly tree cafe.yaml --format=ai
redocly tree cafe.yaml --format=ai --path=/menu --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/orders --operation=post --with-deps
redocly tree cafe.yaml --format=ai --path=/orders/{orderId} --operation=get --with-deps
redocly tree cafe.yaml --format=ai --path=/oauth2/register --operation=post --with-deps
redocly tree cafe.yaml --format=ai --component=schemas --name=Beverage
redocly tree cafe.yaml --format=ai --component=schemas --name=MenuBaseItem
redocly tree cafe.yaml --format=ai --component=schemas --name=OrderItem
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · no tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% tab label="Haiku 4.5 · run 3 · tree" %}

```bash
cat cafe.yaml
```

{% /tab %}
{% /tabs %}

{% /tab %}
{% /tabs %}

At 41 KB the whole description fits in one read, and every model except Haiku 4.5 answers correctly either way.
Haiku 4.5 passes one run in three on both sides, dropping the token call the rest of the time.
This is the description where the index costs more calls than it saves — the alternative is a single read — and still halves the context, because a read pulls in the whole file.

{% /tab %}
{% /tabs %}

## The grid in one view

Context the run added, and the tool calls it took:

| Description | Model     |        no tree |           tree | Difference |
| ----------- | --------- | -------------: | -------------: | ---------: |
| GitHub REST | Sonnet 5  |    12,528 / 14 |     12,915 / 7 |        +3% |
| GitHub REST | Opus 5    |    16,462 / 13 |     16,284 / 9 |        −1% |
| GitHub REST | Fable 5   |    14,815 / 10 |     11,088 / 9 |       −25% |
| GitHub REST | Haiku 4.5 |  15,505 / 8 ❌ |      8,565 / 6 |       −45% |
| Billing API | Sonnet 5  | 31,179 / 32 ❌ | 25,231 / 11 ❌ |       −19% |
| Billing API | Opus 5    |    35,212 / 32 |    32,019 / 21 |        −9% |
| Billing API | Fable 5   |    32,043 / 30 |    18,329 / 11 |       −43% |
| Billing API | Haiku 4.5 | 19,459 / 16 ❌ | 17,174 / 14 ❌ |       −12% |
| Cafe API    | Sonnet 5  |     18,287 / 2 |      8,474 / 5 |       −54% |
| Cafe API    | Opus 5    |     16,769 / 1 |    17,103 / 11 |        +2% |
| Cafe API    | Fable 5   |     16,882 / 1 |      9,889 / 9 |       −41% |
| Cafe API    | Haiku 4.5 |     15,008 / 1 |      7,604 / 8 |       −49% |

Where both sides produce a working flow, the index is cheaper in seven of nine cells, by 1% to 54%.
The ❌ cells are cheap for the wrong reason: Haiku 4.5 covered the 10 MB GitHub description in eight calls for 15,505 tokens and still never minted the installation token its own flow declares.
Tool calls fall everywhere except the 41 KB Cafe API, where the alternative is one read of the whole file: on the billing API 21 against 32 for Opus 5 and 11 against 30 for Fable 5, on GitHub 7 against 14 for Sonnet 5.

What those runs were billed:

| Description | Model     |  no tree |     tree | Difference |
| ----------- | --------- | -------: | -------: | ---------: |
| GitHub REST | Sonnet 5  |    $0.39 |    $0.30 |       −23% |
| GitHub REST | Opus 5    |    $0.72 |    $0.61 |       −15% |
| GitHub REST | Fable 5   |    $1.00 |    $0.80 |       −20% |
| GitHub REST | Haiku 4.5 | $0.10 ❌ |    $0.08 |       −20% |
| Billing API | Sonnet 5  | $1.05 ❌ | $0.49 ❌ |       −53% |
| Billing API | Opus 5    |    $1.56 |    $1.00 |       −36% |
| Billing API | Fable 5   |    $2.82 |    $1.32 |       −53% |
| Billing API | Haiku 4.5 | $0.16 ❌ | $0.14 ❌ |       −12% |
| Cafe API    | Sonnet 5  |    $0.27 |    $0.26 |        −4% |
| Cafe API    | Opus 5    |    $0.41 |    $0.58 |       +41% |
| Cafe API    | Fable 5   |    $0.72 |    $0.82 |       +14% |
| Cafe API    | Haiku 4.5 |    $0.07 |    $0.09 |       +29% |

How many of the three runs in each cell produced a flow that would run:

| Description | Model     | no tree | tree |
| ----------- | --------- | ------: | ---: |
| GitHub REST | Sonnet 5  |     3/3 |  3/3 |
| GitHub REST | Opus 5    |     3/3 |  3/3 |
| GitHub REST | Fable 5   |     3/3 |  3/3 |
| GitHub REST | Haiku 4.5 |     0/3 |  1/3 |
| Billing API | Sonnet 5  |     0/3 |  0/3 |
| Billing API | Opus 5    |     3/3 |  3/3 |
| Billing API | Fable 5   |     3/3 |  3/3 |
| Billing API | Haiku 4.5 |     0/3 |  0/3 |
| Cafe API    | Sonnet 5  |     3/3 |  3/3 |
| Cafe API    | Opus 5    |     3/3 |  3/3 |
| Cafe API    | Fable 5   |     3/3 |  3/3 |
| Cafe API    | Haiku 4.5 |     1/3 |  1/3 |

Fifty-one of 72 runs produced a flow that would run.
One cell that never produced one without the index produced one with it, and no cell went the other way, but two cells failed on both sides: on the billing API, Sonnet 5 and Haiku 4.5 lay out the right sequence of calls and never authenticate it.

## What the failures were

| Reason                                                                              | Runs |
| ----------------------------------------------------------------------------------- | ---: |
| the `REB-APIKEY` header is never named, so no billing call would authenticate       |   10 |
| `POST /products` is missing, so the plan has nothing to sell                        |    6 |
| no call to mint the GitHub App installation token, though the flow says it uses one |    5 |
| no `POST /oauth2/token`, so the cafe order and its status return 401                |    4 |
| `POST /plans` is missing                                                            |    2 |
| the billing key is sent as `Authorization`, which this API rejects                  |    2 |

Every failure is either authentication or a resource a later call depends on.
Nothing fails on the part of the task that is stated out loud — the release, the order, the subscription — and everything fails on what the description holds and the task does not repeat.
On the Cafe API, where one read covers the whole description, both conditions find those. On the two large ones, a search that stops at the first plausible hit does not.

## How this was measured

Every run is a fresh Claude Code session started from the command line with the task text as its only input, allowed to run shell commands, read files and search them.
Sessions start in an empty directory with the description outside any repository, so no `AGENTS.md` or `CLAUDE.md` reaches the model; the tree runs call a published `@redocly/cli` snapshot.
Each cell is three runs, and the tables give the median.

**context** — from the run's transcript, over the `assistant` records that carry a `message.usage`.
A turn's context is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`, which is the whole prompt the model was handed on that turn; the table gives the last turn's minus the first turn's.
The first turn is the system prompt plus the task, so the subtraction drops a fixed cost that is identical in both conditions and drifts between batches.

**actions** — `tool_use` blocks in those same records. One shell call can chain several commands with `;`, so a run's command list is sometimes longer.

**cost** — `total_cost_usd` as the run itself reports it, not recomputed here.
It is the least reproducible number here: a warm prompt cache can halve it for identical work, so read it for shape. Prices differ per model, so amounts compare across a row, not down a column.

**working** — the answer is parsed for the calls it proposes and compared with the flow the description requires: every required call, the host each one goes to, the fields the request body requires, and the scheme that protects the operations.
The check accepts any JSON shape and any equivalent phrasing: a call addressed through a URL an earlier response returns — GitHub's `upload_url`, a CI template expression — counts as that call.
It reports only what is nowhere in the answer.
A cell whose runs all fail is marked ❌ rather than dropped, because the price of an answer that does not work rewards leaving things out and is worth seeing next to the price of one that runs.

**Noise.** Repeating a cell through the index lands within a few percent, without it by up to 83%, because the agent invents a fresh search strategy every time.
Treat anything under about 15% of context as a tie.
