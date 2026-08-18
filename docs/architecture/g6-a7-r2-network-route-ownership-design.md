# G6-A7-R2 Network-ID → Bridge-device Route Ownership

## Outcome boundary

G6-A7-R2 is an append-only attempt-3 correction for the isolated `mkd_distill_438e` candidate runtime. It changes only candidate-present route classification. It does not authorize a live edge write or reload, a public switch, public P9, a provider call, a production/live Agent, certificate/timer mutation, an existing runtime restart, local Docker, commit, or push.

The unchanged fixed inputs remain:

- release `mkd-m1c-438e6ae583fc952d` and site digest `438e6ae5…fadf`;
- archive SHA-256 `ebb709a5…ff59` and package-manifest SHA-256 `e4130a20…5551`;
- Compose project `mkd_distill_438e`, private upstream `172.20.0.1:18922`;
- candidate CIDRs `192.168.224.32/28` and `192.168.224.48/28`.

## Exact correction

For each inspected candidate Docker bridge network, the expected host bridge device is derived from the current 64-hex network ID as `br-${network.id.slice(0, 12)}`. A host route is classified as candidate-owned only when all facts match:

1. the network is one of the two exact candidate names and has the exact candidate subnet;
2. its driver is `bridge` and its inspected network ID is a 64-character lowercase hex value;
3. the route CIDR equals that exact subnet, not merely an overlapping range;
4. the route device equals the bridge device derived from that same inspected network ID.

No CIDR-only exemption exists. Same CIDR on a different device, a partial overlap even on the expected device, any overlapping route on another device, and any overlapping non-candidate Docker network remain blocking conflicts.

## Gate sequence

1. Source-lock the G6-A7-R1 wrapper, materialized attempt-2, blocked receipt, closeout, manifest and archive.
2. Run pure route-classifier fixtures, including hostile wrong-device and partial-overlap cases.
3. Materialize attempt-3 and verify syntax, source capabilities and local preflight without invoking local Docker.
4. Perform one fresh remote protected-state preflight. Mutation is forbidden unless every check passes.
5. Upload the unchanged archive, re-verify all 280 manifest entries, install the isolated release/Compose assets, and create only the two 438e containers and networks.
6. Require two healthy/restart-zero containers, private 18922 smoke, zero external IPAM conflicts, and two exact self-owned route proofs.
7. Freeze an independent receipt. On any failure, remove only this run's exact project/release/Compose/staging resources and read back the protected state. Do not retry automatically.

## Evidence interpretation

A passing receipt proves only that the isolated 438e candidate runtime is retained and eligible for a separately authorized edge-switch review. It is not public deployment, public P9, provider validation, or production/live Agent evidence. A failed receipt remains immutable and routes to an unapproved G6-A7-R3 diagnostic gate.
