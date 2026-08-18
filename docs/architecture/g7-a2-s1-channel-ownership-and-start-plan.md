---
title: G7-A2-S1 Channel Ownership Decision and No-start Plan
status: local-decision-materialized
gate: G7-A2-S1
evidence_grade: L1-public-primary-docs-plus-local-readonly
---

# G7-A2-S1 Channel Ownership Decision and No-start Plan

## Outcome

G7-A2-S1 does not assign `127.0.0.1:15721` to an unproven local runtime and does not start a replacement service. The recommended path is an append-only correction of the G7-A2 admission to DeepSeek's official native Anthropic-compatible base URL:

- origin: `https://api.deepseek.com/anthropic`
- messages path: `/v1/messages`
- exact requested model: `deepseek-v4-flash`
- protocol: Anthropic Messages

This is a decision and planning gate only. The existing G7-A2 admission remains historical and unchanged. No configuration, listener, credential, service or provider state is changed here.

## Evidence boundary

### Confirmed facts

- The effective G7-A2-D1-R1 closeout records a configured loopback origin with no observed listener or trusted start definition, zero provider calls and zero service mutations.
- A bounded local inventory found no executable for the common Anthropic proxy/router candidates listed in the assessment.
- The installed Claude Code package is a client, not evidence of a local Anthropic-compatible server.
- Kimi Desktop is signed by Moonshot and has internal local networking, but its inspected application metadata points at Kimi Work infrastructure and Kimi model aliases. It is not evidence that Kimi owns `15721`, and it is not the admitted DeepSeek model/provider.
- DeepSeek's official documentation exposes a native Anthropic-compatible base URL and documents the exact `deepseek-v4-flash` model.

### Inferences

- `15721` is best treated as an unowned legacy/custom configuration origin until a named owner and source can be proven.
- A third-party protocol translator is unnecessary for the selected DeepSeek model because the official provider already implements the required protocol.
- Reusing an unrelated desktop application's private listener would weaken provenance, lifecycle control and failure isolation.

### Unresolved facts

- The authority/issuer of the currently injected `ANTHROPIC_API_KEY` has not been proven. Presence does not prove that it is a DeepSeek credential.
- No request has reached DeepSeek in this workstream, so credential validity, model entitlement, latency, cost and response conformance remain unverified.

## Solution A — official native Anthropic endpoint (recommended)

The trusted start mechanism is **none**: there is no local daemon, LaunchAgent, Homebrew service, Docker container or background listener to install or start. A later, separately authorized admission-correction gate may bind the immutable two-call canary budget to the official HTTPS origin after the user confirms that the injected secret is issued for DeepSeek.

Benefits:

- one fewer network and lifecycle hop;
- no new local secret store or proxy control plane;
- exact provider and model provenance can be stated from primary documentation;
- the existing G7 request, token, timeout, retry and cost contracts remain the policy boundary;
- rollback is an append-only admission decision, not a service recovery operation.

The next gate must not inherit provider-call permission. It may only prepare and review a corrected admission unless a later gate explicitly authorizes calls.

## Solution B — project-owned ephemeral loopback bridge (contingency only)

Use this option only if a local policy boundary is a hard product requirement that cannot be met by the existing G7 executor. It is not selected and no bridge code or launch asset is created by G7-A2-S1.

If separately authorized, the bridge must be a project-owned, foreground-only child process using the Node.js standard library. It may bind only `127.0.0.1`, accept only `POST /v1/messages`, forward only to `api.deepseek.com:443/anthropic/v1/messages`, require the exact model, enforce the frozen two-call/no-retry/timeout/token/cost permit, reject proxy environment routing and redirects, and terminate after the permit is exhausted or expires. It must not use launchd, Homebrew services, Docker, auto-start, arbitrary model discovery or a persistent credential store.

Before any bridge start, a new gate would need source-reviewed bridge code, a one-time permit, exact PID/port ownership checks, a kill-and-cleanup contract and an explicit service-start authorization. None of those permissions exist in G7-A2-S1.

## Rejected candidates

- unknown runtime on `15721`: rejected because no owner, executable or trusted lifecycle definition was proven;
- Kimi Desktop internal listener: rejected because ownership of `15721` was not proven and backend/model identity differs;
- Claude Code: rejected because it is a client rather than a local provider server;
- LiteLLM, Claude Code Router and similar translators: rejected because none was found installed and protocol translation is not required by the official DeepSeek endpoint;
- persistent project bridge: rejected because persistence adds lifecycle and secret surface without an evidenced requirement.

## Next gate contract

The smallest next gate is `G7-A2-S2`, a local-only append-only admission correction preparation. It requires:

1. explicit confirmation that the credential injected under `ANTHROPIC_API_KEY` is issued for the DeepSeek API, without exposing the value or a derivative;
2. a new admission artifact that replaces only the origin/provider identity semantics while preserving the model, canaries, calls, retries, timeout, token limits, total cost ceiling, owner and independent review requirements;
3. source-locked schema and contract tests proving zero provider calls, zero listener/service changes, zero remote/Docker actions and zero Git actions;
4. a separate later authorization before any DNS/TLS connectivity probe or provider request.

If the credential is not a DeepSeek credential or the user requires a local listener as a non-negotiable boundary, G7-A2-S2 must stop and request a new decision rather than guessing.
