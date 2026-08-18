---
title: Amazon Ads ACOS diagnostic notes
asOf: 2026-08-01
dataClass: synthetic
license: project-authored-synthetic
---

# ACOS diagnosis notes

## Observed change

The fixed workbook shows ACOS rising from 28.4% in the previous seven-day window to 36.9% in the latest seven-day window. Both windows use USD and the same synthetic attribution setting.

## Competing hypotheses

Higher traffic cost and weaker conversion can both raise ACOS. The fixture intentionally omits comparable CPC, CVR, price and availability observations, so neither explanation may be promoted to a verified fact.

## Decision boundary

Prepare an evidence request and a manual action draft. Do not change budget, bids, targeting, negative keywords or campaign state.

## Stop conditions

Stop exact diagnosis when attribution windows differ, attributed sales are zero, currency differs, evidence is expired, or required inputs conflict.
