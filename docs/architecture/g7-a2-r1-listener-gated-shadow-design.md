---
title: G7-A2-R1 Listener-gated Provider Shadow
status: authorized-pending-attempt-2
gate: G7-A2-R1
evidence_grade: L2-preflight-or-L4-authorized-attempt
---

# G7-A2-R1 Listener-gated Provider Shadow

## Purpose

G7-A2-R1 corrects only finding `G7A2-001`: the first G7-A2 executor tried to connect even though an OS-level observation had not found a listener on `127.0.0.1:15721`. The original executor, call receipt, aggregate receipt and semantic correction remain byte-addressed history.

The new attempt-2 wrapper uses an independent namespace and source-locks all four parent artifacts. It does not start, reload, configure or stop any proxy or local service.

## Strong pre-call listener gate

Before reading `ANTHROPIC_API_KEY` or invoking the network-capable client, the wrapper must run the exact argv-only command:

```text
/usr/sbin/lsof -nP -a -iTCP@127.0.0.1:15721 -sTCP:LISTEN -Fpcn
```

The gate passes only if all of the following are true:

- the command exits `0`;
- stdout contains exactly one non-empty process block;
- the name field is exactly `127.0.0.1:15721`;
- the process ID is a positive integer and command name is non-empty;
- stderr is empty;
- the output is at most 4096 bytes.

The wrapper stores only PID, command, listener name, command path, argv, exit status and hashes of stdout/stderr. It does not store unrelated process environment or open-file data.

If the gate fails, the wrapper writes one append-only blocked receipt and exits successfully as a completed fail-closed gate. Its ledger must record secret reads=0, provider calls=0, egress attempts=0 and retries=0. No per-call receipt is allowed to exist.

## Listener-present path

Only after a passing listener observation may the wrapper read `ANTHROPIC_API_KEY` and reuse the frozen Anthropic-compatible client for the same exact inputs and limits:

- model `deepseek-v4-flash`;
- clean canary followed by the already redacted canary;
- at most two calls, sequential;
- zero retries;
- 10 seconds, 1200 input tokens and 500 output tokens per call;
- USD 0.25 authorization ceiling;
- no tools, discovery, redirects, arbitrary URLs, external writes or public Agent action.

Any call failure stops the sequence. A successful attempt still proves only the exact compatibility-channel shadow responses; it does not prove backend provider identity, authoritative cost when unreported, production readiness, or G7-A3 authorization.

## Effective next state

- Listener absent: `blocked-before-secret-read-or-provider-call`; no automatic retry; a future G7-A2-R2 would require separate authorization and evidence that the listener state changed.
- Listener present but call fails: `failed-after-listener-gated-provider-attempt`; no automatic retry.
- Both calls pass: `passed-listener-gated-provider-shadow`; local G7-A3 evaluation becomes a recommendation only, never an inherited authorization.

