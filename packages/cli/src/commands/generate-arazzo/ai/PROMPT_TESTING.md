# Manual prompt quality checks

The unit tests run `--with-ai` against a mocked provider (`vi.mock` of `runProvider`), so CI never sends a prompt to a real model.
They pin the validation pipeline — reference checks, workflow caps, lint gating — but say nothing about how a model responds to the prompts.
An edit to the instructions or to the prompt layouts in `prompt.ts` can therefore degrade workflow quality without failing a single test.

Run the checks below before merging:

- any change to `prompt.ts` (the single-shot instructions, the scenario selection instructions, the scenario design instructions, or `stripProse`),
- a change to `two-pass.ts` that alters what the model sees (schema pruning, description slicing, the operation index).

## Prerequisites

- Run everything from the repository root.
- `npm install` and `npm run compile` completed.
- The `claude` CLI installed and authenticated (`claude -p "ping"` returns an answer).
- The two runs below send 5 prompts to the provider, take a couple of minutes, and consume real API credits.

## Run 1 — single-shot mode (cafe API)

```sh
npm run cli -- generate-arazzo resources/cafe.yaml \
  --with-ai --max-workflows 2 --output-file /tmp/prompt-check-cafe.arazzo.yaml
```

The run must end with `AI designed 2 workflow(s) (claude).` (1 is acceptable; the model may merge scenarios).
An `AI workflow design failed, keeping the auto-generated workflows: ...` warning means the model broke the output contract (invalid YAML, a hallucinated operation, too many workflows, or a lint failure) — treat it as a failed check.

The cafe API is OAuth2-secured with an `ApiKey` scheme for revenue, and exposes an OAuth2 client-registration operation.

1. **Steps chain through outputs.**
   A created resource's id (for example `menuItemId: $response.body#/id`) is declared as a step output and consumed by later steps as `$steps.<stepId>.outputs.<name>`.
2. **Security kept on every secured step.**
   Every step calling an OAuth2-protected operation (for example `createMenuItem`, `createOrder`) carries `x-security` with `schemeName: OAuth2` and `values.accessToken: $inputs.OAuth2`, and `components.inputs.OAuth2` is present.
3. **Client registration requests every declared grant type.**
   The `registerOAuth2Client` step's `grantTypes` contains both `authorization_code` and `client_credentials`.
4. **The file is valid and marked as inferred.**
   The file starts with the `# The workflows below were inferred by AI` comment, and
   `npm run cli -- lint /tmp/prompt-check-cafe.arazzo.yaml` reports it as valid.

## Run 2 — two-pass mode (Rebilly, 636 operations)

```sh
npm run cli -- generate-arazzo tests/smoke/rebilly/rebilly-description.yaml \
  --with-ai --max-workflows 3 --output-file /tmp/prompt-check-rebilly.arazzo.yaml
```

The log must show `The OpenAPI description is too large for a single prompt; selecting operations first...`, then `Selected 3 scenario(s): ...`, then three `— designed` lines.
A `— skipped: ...` line means a design answer broke the contract or a scenario slice did not fit the prompt — treat it as a failed check.

1. **Scenarios are coherent flows.**
   Each selected scenario reads like a real use of the API (for example a customer lifecycle, an order or invoice flow) — not an arbitrary bag of operations.
2. **Steps chain and set path parameters.**
   Steps consuming a created resource set its path parameter from an earlier output, for example `- name: id, in: path, value: $steps.create-customer.outputs.customerId`.
   Rebilly declares most parameters at the path-item level, so a missing path parameter means the slice lost them.
3. **One security alternative per step.**
   Rebilly operations accept `SecretApiKey` OR `JWT` OR `PublishableApiKey`; each secured step must carry exactly one `x-security` entry (`grep -c '\- schemeName:'` equals `grep -c 'x-security:'`).
4. **The file is valid.**
   `npm run cli -- lint /tmp/prompt-check-rebilly.arazzo.yaml` reports it as valid.

## Judging the results

The output is nondeterministic: scenario choices, workflow ids, step wording, and inputs differ between runs.
A check fails when the behavior is missing (a dropped `x-security`, no chaining, a skipped scenario) — not when it is phrased differently.
When a check fails, rerun the command once before concluding anything.
If it fails again, run the same command on `main` and compare: the prompt change regressed only if `main` passes what the branch fails.

## Other providers

The checks above use the default `claude` provider.
Provider wiring (CLI flags, sandboxing) lives in `../../../utils/ai/providers.ts` and does not affect the prompt, so repeating the runs with `--ai-provider codex` or `--ai-provider cursor` is only needed when a change alters how the system and user parts are delivered to those CLIs.
