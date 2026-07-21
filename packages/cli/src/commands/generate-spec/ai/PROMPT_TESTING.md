# Manual prompt quality checks

The e2e tests run `--with-ai` against stub provider binaries (`tests/e2e/generate-spec/fixtures/bin-*`), so CI never sends the prompt to a real model.
`__tests__/prompt.test.ts` pins the prompt text, but says nothing about how a model responds to it.
An edit to `SYSTEM_INSTRUCTIONS` or to the prompt layout in `prompt.ts` can therefore degrade refinement quality without failing a single test.

Run the checks below before merging:

- any change to `prompt.ts`,
- a change to `../samples.ts` that alters what the model sees (sample count, grouping, body truncation).

## Prerequisites

- Run everything from the repository root.
- `npm install` and `npm run compile` completed.
- The `claude` CLI installed and authenticated (`claude -p "ping"` returns an answer).
- The two runs below send 7 prompts to the provider, take a few minutes, and consume real API credits.

## Run

```sh
npm run cli -- generate-spec tests/e2e/generate-spec/fixtures/traffic.ndjson \
  --with-ai --output /tmp/prompt-check-users.yaml

npm run cli -- generate-spec tests/e2e/generate-spec/fixtures/traffic-polymorphic.ndjson \
  --with-ai --output /tmp/prompt-check-payments.yaml
```

The first run must end with `AI refinement complete: 5 of 5 operation(s) refined (claude).`, the second with `2 of 2`.
A `kept the baseline: ...` warning means the model broke the output contract (invalid YAML, dropped path/status/operationId, redefined a reserved component, or failed the lint) — treat it as a failed check.

## Checks — users run (`/tmp/prompt-check-users.yaml`)

The traffic is a small users API: `GET/POST /users`, `GET/DELETE /users/{userId}`, `POST /sessions` (a form login).
The deterministic baseline is the `tests/e2e/generate-spec/__snapshots__/infer-ndjson.txt` snapshot; the refined output must keep everything the baseline already detected.

1. **Descriptions added.**
   Every operation has a `summary` or `description`; the `limit`, `sort`, and `userId` parameters are described.
2. **Detected format kept.**
   The `email` properties keep `format: email` (in the `User` component and in the `POST /users` request body).
3. **Component references kept.**
   The three operations that referenced `#/components/schemas/User` still reference it; the component is not renamed.
4. **Secrets never copied into examples.**
   The recorded traffic contains `password=secret` and a `token` value `abc123`.
   `grep -c 'abc123' /tmp/prompt-check-users.yaml` must print `0`, and any `password` example must be a clearly fictional placeholder.

## Checks — payments run (`/tmp/prompt-check-payments.yaml`)

The traffic is `POST /payments` with two request body variants (`type: card` vs `type: bank_transfer`) and `GET /payments/{paymentId}` with a nullable `note`.
The baseline (`infer-polymorphic.txt` snapshot) has the variants inline in a `oneOf` without a discriminator, and a `status` enum on the `201` response.

1. **Named `oneOf` variants.**
   The `POST /payments` request body is a `oneOf` of two named component schemas (for example `CardPayment` / `BankTransferPayment`) instead of the baseline's inline variants.
2. **Discriminator added.**
   The `oneOf` carries `discriminator` with `propertyName: type` (an explicit `mapping` is optional).
3. **Detected enum kept.**
   `status` keeps `enum` with `pending` and `succeeded` on the `201` response.
   Extending the `GET` response's `status` with the same enum is a bonus; removing the existing enum is a failure.
4. **Nullable kept.**
   `note` stays a `string`/`null` type union.

There is no secret-redaction check in this run: the recorded card number (`4111111111111111`) and IBAN (`DE89370400440532013000`) are the canonical test values for their formats, so the model may legitimately output them as placeholders.
The redaction behavior is checked by the users run (check 4).

## Judging the results

The output is nondeterministic: component names, wording, and example values differ between runs.
A check fails when the behavior is missing (a dropped enum, no discriminator, a copied secret) — not when it is phrased differently.
When a check fails, rerun the command once before concluding anything.
If it fails again, run the same command on `main` and compare: the prompt change regressed only if `main` passes what the branch fails.

## Other providers

The checks above use the default `claude` provider.
Provider wiring (CLI flags, sandboxing) lives in `providers.ts` and does not affect the prompt, so repeating the runs with `--ai-provider codex` or `--ai-provider cursor` is only needed when a change alters how the system and user parts are delivered to those CLIs (see `buildOperationPrompt`).
